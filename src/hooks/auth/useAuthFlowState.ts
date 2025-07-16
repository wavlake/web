/**
 * Pure Authentication Flow State Machine
 *
 * This hook manages the core state transitions and navigation logic
 * for the V3 authentication flow without any side effects or external API calls.
 */

import { useReducer, useCallback } from "react";
import { NUser } from "@nostrify/react/login";
import { logAuthState } from "@/lib/authStateLogger";

// ============================================================================
// Types - Extracted from original useV3AuthFlow
// ============================================================================

export type V3AuthStep =
  // Main flow
  | "method-selection"
  // Sign-up path
  | "sign-up" // User type selection (artist vs listener)
  | "artist-type" // Solo vs Band/Group selection
  | "profile-setup" // EditProfileForm step
  | "firebase-backup" // Email backup for artists
  // Sign-in path
  | "nostr-auth" // Primary Nostr authentication
  | "legacy-auth" // Firebase signin for migration
  | "account-linking" // Link legacy Firebase to Nostr
  | "account-generation" // Create new Nostr account and link to Firebase
  // Shared completion
  | "welcome"; // Settings initialization + navigation

export interface V3AuthState {
  // Current step in the flow
  step: V3AuthStep;
  // User type state (from SignUp.tsx)
  isArtist: boolean;
  isSoloArtist: boolean;
  // Current user state
  currentUser: NUser | null;
  // Navigation and flow tracking
  completedSteps: V3AuthStep[];
  canGoBack: boolean;
  // Error state
  error: string | null;
  // Track if account was newly generated (needs profile setup)
  isNewlyGeneratedAccount: boolean;
}

export type V3AuthAction =
  // Navigation actions
  | { type: "GO_BACK" }
  | { type: "RESET" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  // Main flow actions
  | { type: "SELECT_SIGNUP" }
  | { type: "SELECT_SIGNIN" }
  | { type: "SELECT_LEGACY_AUTH" }
  | { type: "SELECT_ACCOUNT_GENERATION" }
  // Sign-up flow actions
  | { type: "SET_USER_TYPE"; isArtist: boolean }
  | { type: "SET_ARTIST_TYPE"; isSoloArtist: boolean }
  | { type: "ACCOUNT_CREATED" }
  | { type: "PROFILE_CREATED" }
  | { type: "FIREBASE_BACKUP_COMPLETE" }
  // Sign-in flow actions
  | { type: "NOSTR_AUTH_COMPLETE" }
  | { type: "LEGACY_AUTH_COMPLETE" }
  | { type: "ACCOUNT_LINKING_COMPLETE" }
  | { type: "ACCOUNT_GENERATION_COMPLETE" }
  // Completion
  | { type: "WELCOME_COMPLETE" };

// ============================================================================
// Initial State
// ============================================================================

const initialState: V3AuthState = {
  step: "method-selection",
  isArtist: true,
  isSoloArtist: true,
  currentUser: null,
  completedSteps: [],
  canGoBack: false,
  error: null,
  isNewlyGeneratedAccount: false,
};

// ============================================================================
// Reducer - Pure State Transitions
// ============================================================================

function v3AuthReducer(state: V3AuthState, action: V3AuthAction): V3AuthState {
  const addCompletedStep = (step: V3AuthStep): V3AuthStep[] => [
    ...state.completedSteps.filter((s) => s !== step),
    step,
  ];

  // Log state transitions
  logAuthState(state.step, { action: action.type, currentState: state });

  switch (action.type) {
    case "GO_BACK":
      // Implement smart back navigation based on current step
      switch (state.step) {
        case "sign-up":
        case "nostr-auth":
          return { ...state, step: "method-selection", canGoBack: false };

        case "artist-type":
          return { ...state, step: "sign-up", canGoBack: true };

        case "profile-setup":
          if (state.isArtist) {
            return { ...state, step: "artist-type", canGoBack: true };
          }
          return { ...state, step: "sign-up", canGoBack: true };

        case "firebase-backup":
          return { ...state, step: "profile-setup", canGoBack: true };

        case "legacy-auth":
          return { ...state, step: "nostr-auth", canGoBack: true };

        case "account-linking":
          return { ...state, step: "legacy-auth", canGoBack: true };

        case "account-generation":
          return { ...state, step: "legacy-auth", canGoBack: true };

        case "welcome":
          // Can't go back from welcome
          return state;

        default:
          return { ...state, step: "method-selection", canGoBack: false };
      }

    case "RESET":
      return initialState;

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    // Main flow transitions
    case "SELECT_SIGNUP":
      return {
        ...state,
        step: "sign-up",
        canGoBack: true,
        completedSteps: addCompletedStep("method-selection"),
      };

    case "SELECT_SIGNIN":
      return {
        ...state,
        step: "nostr-auth",
        canGoBack: true,
        completedSteps: addCompletedStep("method-selection"),
      };

    case "SELECT_LEGACY_AUTH":
      return {
        ...state,
        step: "legacy-auth",
        canGoBack: true,
        completedSteps: addCompletedStep("nostr-auth"),
      };

    case "SELECT_ACCOUNT_GENERATION":
      return {
        ...state,
        step: "account-generation",
        canGoBack: true,
        completedSteps: addCompletedStep("legacy-auth"),
      };

    // Sign-up flow transitions
    case "SET_USER_TYPE":
      return {
        ...state,
        isArtist: action.isArtist,
        step: action.isArtist ? "artist-type" : "profile-setup",
        canGoBack: true,
        completedSteps: addCompletedStep("sign-up"),
      };

    case "SET_ARTIST_TYPE":
      return {
        ...state,
        isSoloArtist: action.isSoloArtist,
        step: "profile-setup",
        canGoBack: true,
        completedSteps: addCompletedStep("artist-type"),
      };

    case "ACCOUNT_CREATED":
      return {
        ...state,
        // Stay on current step, but now user is logged in
      };

    case "PROFILE_CREATED":
      return {
        ...state,
        step:
          state.isArtist && !state.isNewlyGeneratedAccount
            ? "firebase-backup"
            : "welcome",
        canGoBack: state.isArtist && !state.isNewlyGeneratedAccount,
        completedSteps: addCompletedStep("profile-setup"),
      };

    case "FIREBASE_BACKUP_COMPLETE":
      return {
        ...state,
        step: "welcome",
        canGoBack: false,
        completedSteps: addCompletedStep("firebase-backup"),
      };

    // Sign-in flow transitions
    case "NOSTR_AUTH_COMPLETE":
      return {
        ...state,
        step: "welcome",
        canGoBack: false,
        completedSteps: addCompletedStep("nostr-auth"),
      };

    case "LEGACY_AUTH_COMPLETE":
      return {
        ...state,
        step: "account-linking",
        canGoBack: true,
        completedSteps: addCompletedStep("legacy-auth"),
      };

    case "ACCOUNT_LINKING_COMPLETE":
      return {
        ...state,
        step: "welcome",
        canGoBack: false,
        completedSteps: addCompletedStep("account-linking"),
      };

    case "ACCOUNT_GENERATION_COMPLETE":
      return {
        ...state,
        step: "welcome",
        canGoBack: true,
        isNewlyGeneratedAccount: true,
        completedSteps: addCompletedStep("account-generation"),
      };

    case "WELCOME_COMPLETE":
      return {
        ...state,
        completedSteps: addCompletedStep("welcome"),
      };

    default:
      return state;
  }
}

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseAuthFlowStateResult {
  // Current state
  state: V3AuthState;

  // State getters
  step: V3AuthStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  canGoBack: boolean;
  error: string | null;
  isNewlyGeneratedAccount: boolean;

  // Action dispatchers
  dispatch: React.Dispatch<V3AuthAction>;

  // Common actions (convenience methods)
  goBack: () => void;
  reset: () => void;
  setError: (error: string) => void;
  clearError: () => void;

  // Step transitions
  selectSignup: () => void;
  selectSignin: () => void;
  selectLegacyAuth: () => void;
  selectAccountGeneration: () => void;
  setUserType: (isArtist: boolean) => void;
  setArtistType: (isSoloArtist: boolean) => void;
  accountCreated: () => void;
  profileCreated: () => void;
  firebaseBackupComplete: () => void;
  nostrAuthComplete: () => void;
  legacyAuthComplete: () => void;
  accountLinkingComplete: () => void;
  accountGenerationComplete: () => void;
  welcomeComplete: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Pure state machine for V3 authentication flow
 *
 * This hook manages state transitions and navigation logic without any side effects.
 * It provides a clean interface for updating state and checking current flow status.
 *
 * @example
 * ```tsx
 * const { step, isArtist, selectSignup, setUserType } = useAuthFlowState();
 *
 * if (step === "method-selection") {
 *   return <MethodSelection onSignup={selectSignup} />;
 * }
 *
 * if (step === "sign-up") {
 *   return <UserTypeSelection onSelect={setUserType} />;
 * }
 * ```
 */
export function useAuthFlowState(): UseAuthFlowStateResult {
  const [state, dispatch] = useReducer(v3AuthReducer, initialState);

  // Common action helpers
  const goBack = useCallback(() => {
    if (state.canGoBack) {
      dispatch({ type: "GO_BACK" });
    }
  }, [state.canGoBack]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: "SET_ERROR", error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // Step transition helpers
  const selectSignup = useCallback(() => {
    dispatch({ type: "SELECT_SIGNUP" });
  }, []);

  const selectSignin = useCallback(() => {
    dispatch({ type: "SELECT_SIGNIN" });
  }, []);

  const selectLegacyAuth = useCallback(() => {
    dispatch({ type: "SELECT_LEGACY_AUTH" });
  }, []);

  const selectAccountGeneration = useCallback(() => {
    dispatch({ type: "SELECT_ACCOUNT_GENERATION" });
  }, []);

  const setUserType = useCallback((isArtist: boolean) => {
    dispatch({ type: "SET_USER_TYPE", isArtist });
  }, []);

  const setArtistType = useCallback((isSoloArtist: boolean) => {
    dispatch({ type: "SET_ARTIST_TYPE", isSoloArtist });
  }, []);

  const accountCreated = useCallback(() => {
    dispatch({ type: "ACCOUNT_CREATED" });
  }, []);

  const profileCreated = useCallback(() => {
    dispatch({ type: "PROFILE_CREATED" });
  }, []);

  const firebaseBackupComplete = useCallback(() => {
    dispatch({ type: "FIREBASE_BACKUP_COMPLETE" });
  }, []);

  const nostrAuthComplete = useCallback(() => {
    dispatch({ type: "NOSTR_AUTH_COMPLETE" });
  }, []);

  const legacyAuthComplete = useCallback(() => {
    dispatch({ type: "LEGACY_AUTH_COMPLETE" });
  }, []);

  const accountLinkingComplete = useCallback(() => {
    dispatch({ type: "ACCOUNT_LINKING_COMPLETE" });
  }, []);

  const accountGenerationComplete = useCallback(() => {
    dispatch({ type: "ACCOUNT_GENERATION_COMPLETE" });
  }, []);

  const welcomeComplete = useCallback(() => {
    dispatch({ type: "WELCOME_COMPLETE" });
  }, []);

  return {
    // Current state
    state,

    // State getters
    step: state.step,
    isArtist: state.isArtist,
    isSoloArtist: state.isSoloArtist,
    canGoBack: state.canGoBack,
    error: state.error,
    isNewlyGeneratedAccount: state.isNewlyGeneratedAccount,

    // Action dispatchers
    dispatch,

    // Common actions
    goBack,
    reset,
    setError,
    clearError,

    // Step transitions
    selectSignup,
    selectSignin,
    selectLegacyAuth,
    selectAccountGeneration,
    setUserType,
    setArtistType,
    accountCreated,
    profileCreated,
    firebaseBackupComplete,
    nostrAuthComplete,
    legacyAuthComplete,
    accountLinkingComplete,
    accountGenerationComplete,
    welcomeComplete,
  };
}
