/**
 * Legacy Migration State Machine
 * 
 * Manages the complex state for legacy account migration including
 * Firebase auth, pubkey checking, and account linking/generation.
 */

import { useReducer, useCallback, useMemo } from 'react';
import { createAsyncAction, handleBaseActions, isOperationLoading, getOperationError } from '../utils/stateMachineUtils';
import { ActionResult, LegacyMigrationState, LegacyMigrationAction, LegacyMigrationStep, LinkedPubkey, NostrAccount } from './types';
import { NostrAuthMethod, NostrCredentials } from '@/types/authFlow';
import { User as FirebaseUser } from 'firebase/auth';
import { type ProfileData } from '@/types/profile';
import { makeLinkedPubkeysRequest } from '@/hooks/useLinkedPubkeys';
import { makeLinkAccountRequest } from '../useLinkAccount';

const initialState: LegacyMigrationState = {
  step: "firebase-auth",
  firebaseUser: null,
  linkedPubkeys: [],
  expectedPubkey: null,
  generatedAccount: null,
  createdLogin: null,
  generatedName: null,
  profileData: null,
  isLoading: {},
  errors: {},
  canGoBack: false,
};

function legacyMigrationReducer(state: LegacyMigrationState, action: LegacyMigrationAction): LegacyMigrationState {
  // Handle base async actions first
  const baseResult = handleBaseActions(state, action);
  if (baseResult) {
    return baseResult as LegacyMigrationState;
  }

  switch (action.type) {
    case "FIREBASE_AUTH_COMPLETED":
      return {
        ...state,
        firebaseUser: action.firebaseUser,
        step: "checking-links",
        canGoBack: true,
      };

    case "LINKS_CHECKED":
      return {
        ...state,
        linkedPubkeys: action.linkedPubkeys,
        step: action.linkedPubkeys.length > 0 ? "linked-nostr-auth" : "account-choice",
        expectedPubkey: action.linkedPubkeys.length > 0 ? action.linkedPubkeys[0].pubkey : null,
        canGoBack: true,
      };

    case "ACCOUNT_CHOICE_MADE":
      return {
        ...state,
        step: action.choice === "generate" ? "account-generation" : "bring-own-keypair",
        canGoBack: true,
      };

    case "ACCOUNT_GENERATED":
      return {
        ...state,
        generatedAccount: action.account,
        step: "profile-setup",
        canGoBack: true,
      };

    case "KEYPAIR_AUTHENTICATED":
      return {
        ...state,
        generatedAccount: action.account,
        step: "profile-setup",
        canGoBack: true,
      };

    case "ACCOUNT_CREATED":
      return {
        ...state,
        createdLogin: action.login,
        generatedName: action.generatedName || null,
      };

    case "PROFILE_COMPLETED":
      return {
        ...state,
        profileData: action.profileData,
        step: "linking",
        canGoBack: true,
      };

    case "LINKING_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "LOGIN_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "GO_BACK": {
      const previousStep = getPreviousStep(state.step, state.linkedPubkeys.length > 0);
      return {
        ...state,
        step: previousStep,
        canGoBack: previousStep !== "firebase-auth",
      };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

function getPreviousStep(currentStep: LegacyMigrationStep, hasLinkedAccounts: boolean): LegacyMigrationStep {
  switch (currentStep) {
    case "checking-links":
      return "firebase-auth";
    case "linked-nostr-auth":
      return "checking-links";
    case "account-choice":
      return "checking-links";
    case "account-generation":
    case "bring-own-keypair":
      return hasLinkedAccounts ? "linked-nostr-auth" : "account-choice";
    case "profile-setup":
      return "account-generation"; // Could be from account-generation or bring-own-keypair
    case "linking":
      // This step should no longer be reached due to atomic linking
      return "profile-setup";
    default:
      return "firebase-auth";
  }
}

// Hook interface
export interface UseLegacyMigrationStateMachineResult {
  // State
  step: LegacyMigrationStep;
  firebaseUser: FirebaseUser | null;
  linkedPubkeys: LinkedPubkey[];
  expectedPubkey: string | null;
  generatedAccount: NostrAccount | null;
  createdLogin: import("@nostrify/react/login").NLoginType | null;
  generatedName: string | null;
  profileData: ProfileData | null;
  canGoBack: boolean;
  
  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => Error | null;
  
  // Promise-based actions
  actions: {
    authenticateWithFirebase: (email: string, password: string) => Promise<ActionResult>;
    authenticateWithLinkedNostr: (credentials: NostrCredentials) => Promise<ActionResult>;
    generateNewAccount: () => Promise<ActionResult>;
    bringOwnKeypair: (credentials: NostrCredentials) => Promise<ActionResult>;
    completeProfile: (profileData: ProfileData) => Promise<ActionResult>;
    completeLogin: () => Promise<ActionResult>;
  };
  
  // Navigation
  goBack: () => void;
  reset: () => void;
}

export interface LegacyMigrationStateMachineDependencies {
  firebaseAuth: (email: string, password: string) => Promise<FirebaseUser>;
  authenticateNostr: (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<NostrAccount>;
  createAccount: () => Promise<{ login: import("@nostrify/react/login").NLoginType; generatedName: string }>;
  addLogin: (login: import("@nostrify/react/login").NLoginType) => void;
  setupAccount: (profileData: ProfileData | null, generatedName: string) => Promise<void>;
}

export function useLegacyMigrationStateMachine(
  dependencies: LegacyMigrationStateMachineDependencies
): UseLegacyMigrationStateMachineResult {
  const [state, dispatch] = useReducer(legacyMigrationReducer, initialState);
  
  // Create async action handlers
  const authenticateWithFirebase = useMemo(() => 
    createAsyncAction("authenticateWithFirebase", async (email: string, password: string) => {
      // Firebase auth
      const firebaseUser = await dependencies.firebaseAuth(email, password);
      dispatch({ type: "FIREBASE_AUTH_COMPLETED", firebaseUser });
      
      // Check for linked pubkeys using direct API call
      const firebaseToken = await firebaseUser.getIdToken();
      const linkedPubkeys = await makeLinkedPubkeysRequest(firebaseUser, firebaseToken);
      dispatch({ type: "LINKS_CHECKED", linkedPubkeys });
      
      return { firebaseUser, linkedPubkeys };
    }, dispatch), [dependencies]);

  const authenticateWithLinkedNostr = useMemo(() =>
    createAsyncAction("authenticateWithLinkedNostr", async (credentials: NostrCredentials) => {
      // Verify matches expected pubkey and complete auth
      const account = await dependencies.authenticateNostr("extension", credentials);
      
      // Navigate to app (linking already exists)
      dispatch({ type: "LINKING_COMPLETED" });
      
      return { account };
    }, dispatch), [dependencies]);

  const generateNewAccount = useMemo(() =>
    createAsyncAction("generateNewAccount", async () => {
      // Create Nostr account but don't log in yet
      const { login, generatedName } = await dependencies.createAccount();
      dispatch({ type: "ACCOUNT_CREATED", login, generatedName });
      
      // Convert login to NostrAccount for linking (no redundant account creation)
      const account: NostrAccount = {
        pubkey: login.pubkey,
        signer: login,
        profile: {
          name: generatedName,
        },
      };
      dispatch({ type: "ACCOUNT_GENERATED", account });
      
      // Link to Firebase atomically using direct API call
      if (!state.firebaseUser) {
        throw new Error("Firebase user not available for linking");
      }
      const firebaseToken = await state.firebaseUser.getIdToken();
      await makeLinkAccountRequest({
        pubkey: account.pubkey,
        firebaseUid: state.firebaseUser.uid,
        authToken: firebaseToken,
        signer: account.signer as any,
      });
      
      // Skip separate linking step and go directly to complete
      dispatch({ type: "LOGIN_COMPLETED" });
      
      return { login, generatedName };
    }, dispatch), [dependencies, state.firebaseUser]);

  const bringOwnKeypair = useMemo(() =>
    createAsyncAction("bringOwnKeypair", async (credentials: NostrCredentials) => {
      // Authenticate with provided keys
      const account = await dependencies.authenticateNostr("nsec", credentials);
      dispatch({ type: "KEYPAIR_AUTHENTICATED", account });
      
      // Link to Firebase atomically using direct API call
      if (!state.firebaseUser) {
        throw new Error("Firebase user not available for linking");
      }
      const firebaseToken = await state.firebaseUser.getIdToken();
      await makeLinkAccountRequest({
        pubkey: account.pubkey,
        firebaseUid: state.firebaseUser.uid,
        authToken: firebaseToken,
        signer: account.signer as any,
      });
      
      // Skip separate linking step and go directly to complete
      dispatch({ type: "LOGIN_COMPLETED" });
      
      return { account };
    }, dispatch), [dependencies, state.firebaseUser]);

  const completeProfile = useMemo(() =>
    createAsyncAction("completeProfile", async (profileData: ProfileData) => {
      dispatch({ type: "PROFILE_COMPLETED", profileData });
      return {};
    }, dispatch), []);

  const completeLogin = useMemo(() =>
    createAsyncAction("completeLogin", async () => {
      if (state.createdLogin && state.generatedName) {
        // Add the login to actually log the user in
        dependencies.addLogin(state.createdLogin);
        
        // Setup account (create wallet, publish profile)
        // Use the profile data from the profile setup step
        await dependencies.setupAccount(state.profileData, state.generatedName);
        
        dispatch({ type: "LOGIN_COMPLETED" });
        return { success: true };
      }
      throw new Error("No login or generated name available");
    }, dispatch), [dependencies, state.createdLogin, state.generatedName, state.profileData]);

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
    firebaseUser: state.firebaseUser,
    linkedPubkeys: state.linkedPubkeys,
    expectedPubkey: state.expectedPubkey,
    generatedAccount: state.generatedAccount,
    createdLogin: state.createdLogin,
    generatedName: state.generatedName,
    profileData: state.profileData,
    canGoBack: state.canGoBack,
    
    // Helpers
    isLoading,
    getError,
    
    // Actions
    actions: {
      authenticateWithFirebase,
      authenticateWithLinkedNostr,
      generateNewAccount,
      bringOwnKeypair,
      completeProfile,
      completeLogin,
    },
    
    // Navigation
    goBack,
    reset,
  };
}