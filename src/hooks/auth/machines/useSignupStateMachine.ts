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

    case "PROFILE_COMPLETED":
      return {
        ...state,
        step: state.isArtist ? "firebase-backup" : "complete",
        canGoBack: state.isArtist,
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
  account: any | null;
  
  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => string | null;
  
  // Promise-based actions
  actions: {
    setUserType: (isArtist: boolean) => Promise<ActionResult>;
    setArtistType: (isSolo: boolean) => Promise<ActionResult>;
    completeProfile: (profileData: any) => Promise<ActionResult>;
    setupFirebaseBackup: (email: string, password: string) => Promise<ActionResult>;
    skipFirebaseBackup: () => void;
  };
  
  // Navigation
  goBack: () => void;
  reset: () => void;
}

export interface SignupStateMachineDependencies {
  createAccount: () => Promise<any>;
  saveProfile: (data: any) => Promise<void>;
  createFirebaseAccount: (email: string, password: string) => Promise<any>;
  linkAccounts: () => Promise<void>;
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
        const account = await dependencies.createAccount();
        return { account };
      }
      
      return {};
    }, dispatch), [dependencies.createAccount]);

  const setArtistType = useMemo(() =>
    createAsyncAction("setArtistType", async (isSolo: boolean) => {
      // Update state first
      dispatch({ type: "SET_ARTIST_TYPE", isSolo });
      
      // Create account for profile setup
      const account = await dependencies.createAccount();
      return { account };
    }, dispatch), [dependencies.createAccount]);

  const completeProfile = useMemo(() =>
    createAsyncAction("completeProfile", async (profileData: any) => {
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
    },
    
    // Navigation
    goBack,
    reset,
  };
}