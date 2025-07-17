/**
 * Signup State Machine
 * 
 * Manages the state for new user signup flow including user type selection,
 * profile setup, and optional Firebase backup.
 */

import { useReducer, useCallback, useMemo } from 'react';
import { createAsyncAction, handleBaseActions, isOperationLoading, getOperationError } from '../utils/stateMachineUtils';
import { ActionResult, SignupState, SignupAction, SignupStep } from './types';

const initialState: SignupState = {
  step: "user-type",
  isArtist: false,
  isSoloArtist: true,
  isLoading: {},
  errors: {},
  canGoBack: false,
  account: null,
  createdLogin: null,
  generatedName: null,
};

function signupReducer(state: SignupState, action: SignupAction): SignupState {
  // Handle base async actions first
  const baseResult = handleBaseActions(state, action);
  if (baseResult) {
    return baseResult as SignupState;
  }

  switch (action.type) {
    case "SET_USER_TYPE":
      return {
        ...state,
        isArtist: action.isArtist,
        step: action.isArtist ? "artist-type" : "profile-setup",
        canGoBack: true,
      };

    case "SET_ARTIST_TYPE":
      return {
        ...state,
        isSoloArtist: action.isSolo,
        step: "profile-setup",
        canGoBack: true,
      };

    case "ACCOUNT_CREATED":
      return {
        ...state,
        createdLogin: action.login,
        generatedName: action.generatedName,
      };

    case "PROFILE_COMPLETED":
      return {
        ...state,
        step: state.isArtist ? "firebase-backup" : "complete",
        canGoBack: state.isArtist,
      };

    case "LOGIN_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "FIREBASE_BACKUP_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "FIREBASE_BACKUP_SKIPPED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "GO_BACK":
      const previousStep = getPreviousStep(state.step, state.isArtist);
      return {
        ...state,
        step: previousStep,
        canGoBack: previousStep !== "user-type",
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

function getPreviousStep(currentStep: SignupStep, isArtist: boolean): SignupStep {
  switch (currentStep) {
    case "artist-type":
      return "user-type";
    case "profile-setup":
      return isArtist ? "artist-type" : "user-type";
    case "firebase-backup":
      return "profile-setup";
    default:
      return "user-type";
  }
}

// Hook interface
export interface UseSignupStateMachineResult {
  // State
  step: SignupStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  canGoBack: boolean;
  account: unknown | null;
  createdLogin: import("@nostrify/react/login").NLoginType | null;
  generatedName: string | null;
  
  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => Error | null;
  
  // Promise-based actions
  actions: {
    setUserType: (isArtist: boolean) => Promise<ActionResult>;
    setArtistType: (isSolo: boolean) => Promise<ActionResult>;
    completeProfile: (profileData: unknown) => Promise<ActionResult>;
    setupFirebaseBackup: (email: string, password: string) => Promise<ActionResult>;
    skipFirebaseBackup: () => void;
    completeLogin: () => Promise<ActionResult>;
  };
  
  // Navigation
  goBack: () => void;
  reset: () => void;
}

export interface SignupStateMachineDependencies {
  createAccount: () => Promise<{ login: import("@nostrify/react/login").NLoginType; generatedName: string }>;
  saveProfile: (data: unknown) => Promise<void>;
  createFirebaseAccount: (email: string, password: string) => Promise<unknown>;
  linkAccounts: () => Promise<void>;
  addLogin: (login: import("@nostrify/react/login").NLoginType) => void;
  setupAccount: (generatedName: string) => Promise<void>;
}

export function useSignupStateMachine(
  dependencies: SignupStateMachineDependencies
): UseSignupStateMachineResult {
  const [state, dispatch] = useReducer(signupReducer, initialState);
  
  // Create async action handlers
  const setUserType = useMemo(() => 
    createAsyncAction("setUserType", async (isArtist: boolean) => {
      // Update state first
      dispatch({ type: "SET_USER_TYPE", isArtist });
      
      // For listeners, create account immediately
      if (!isArtist) {
        const { login, generatedName } = await dependencies.createAccount();
        dispatch({ type: "ACCOUNT_CREATED", login, generatedName });
        return { login, generatedName };
      }
      
      return {};
    }, dispatch), [dependencies.createAccount]);

  const setArtistType = useMemo(() =>
    createAsyncAction("setArtistType", async (isSolo: boolean) => {
      // Update state first
      dispatch({ type: "SET_ARTIST_TYPE", isSolo });
      
      // Create account for profile setup
      const { login, generatedName } = await dependencies.createAccount();
      dispatch({ type: "ACCOUNT_CREATED", login, generatedName });
      return { login, generatedName };
    }, dispatch), [dependencies.createAccount]);

  const completeProfile = useMemo(() =>
    createAsyncAction("completeProfile", async (profileData: unknown) => {
      await dependencies.saveProfile(profileData);
      dispatch({ type: "PROFILE_COMPLETED" });
      return {};
    }, dispatch), [dependencies.saveProfile]);

  const setupFirebaseBackup = useMemo(() =>
    createAsyncAction("setupFirebaseBackup", async (email: string, password: string) => {
      const firebaseUser = await dependencies.createFirebaseAccount(email, password);
      await dependencies.linkAccounts();
      dispatch({ type: "FIREBASE_BACKUP_COMPLETED" });
      return { firebaseUser };
    }, dispatch), [dependencies.createFirebaseAccount, dependencies.linkAccounts]);

  const skipFirebaseBackup = useCallback(() => {
    dispatch({ type: "FIREBASE_BACKUP_SKIPPED" });
  }, []);

  const completeLogin = useMemo(() =>
    createAsyncAction("completeLogin", async () => {
      if (state.createdLogin && state.generatedName) {
        // Add the login to actually log the user in
        dependencies.addLogin(state.createdLogin);
        
        // Setup account (create wallet, publish profile)
        await dependencies.setupAccount(state.generatedName);
        
        dispatch({ type: "LOGIN_COMPLETED" });
        return { success: true };
      }
      throw new Error("No login or generated name available");
    }, dispatch), [state.createdLogin, state.generatedName, dependencies.addLogin, dependencies.setupAccount]);

  // Navigation helpers
  const goBack = useCallback(() => {
    if (state.canGoBack) {
      dispatch({ type: "GO_BACK" });
    }
  }, [state.canGoBack]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Loading and error helpers
  const isLoading = useCallback((operation: string) => 
    isOperationLoading(state, operation), [state]);
  
  const getError = useCallback((operation: string) => 
    getOperationError(state, operation), [state]);

  return {
    // State
    step: state.step,
    isArtist: state.isArtist,
    isSoloArtist: state.isSoloArtist,
    canGoBack: state.canGoBack,
    account: state.account,
    createdLogin: state.createdLogin,
    generatedName: state.generatedName,
    
    // Helpers
    isLoading,
    getError,
    
    // Actions
    actions: {
      setUserType,
      setArtistType,
      completeProfile,
      setupFirebaseBackup,
      skipFirebaseBackup,
      completeLogin,
    },
    
    // Navigation
    goBack,
    reset,
  };
}