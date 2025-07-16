/**
 * V3 Authentication Flow State Machine
 *
 * This hook consolidates the auth flows from Login.tsx, SignIn.tsx, and SignUp.tsx
 * into a single state machine while preserving all existing UX and business logic.
 */

import { useReducer, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User as FirebaseUser } from "firebase/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useAppSettings from "@/hooks/useAppSettings";
import { useLegacyArtists } from "@/hooks/useLegacyApi";
import { useLinkedPubkeys } from "@/hooks/useLinkedPubkeys";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { useV3CreateAccount } from "@/components/auth/v3/useV3CreateAccount";

// ============================================================================
// Types - Based on Current V3 Implementation
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

  // Shared completion
  | "welcome"; // Settings initialization + navigation

export interface V3AuthState {
  // Current step in the flow
  step: V3AuthStep;

  // User type state (from SignUp.tsx)
  isArtist: boolean;
  isSoloArtist: boolean;

  // Current user and Firebase state
  currentUser: any;
  firebaseUser: FirebaseUser | null;

  // Navigation and flow tracking
  completedSteps: V3AuthStep[];
  canGoBack: boolean;

  // Error state
  error: string | null;
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

  // Sign-up flow actions (preserving SignUp.tsx logic)
  | { type: "SET_USER_TYPE"; isArtist: boolean }
  | { type: "SET_ARTIST_TYPE"; isSoloArtist: boolean }
  | { type: "ACCOUNT_CREATED" }
  | { type: "PROFILE_CREATED" }
  | { type: "FIREBASE_BACKUP_COMPLETE" }

  // Sign-in flow actions (preserving SignIn.tsx logic)
  | { type: "NOSTR_AUTH_COMPLETE" }
  | { type: "LEGACY_AUTH_COMPLETE"; firebaseUser: FirebaseUser }
  | { type: "ACCOUNT_LINKING_COMPLETE" }

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
  firebaseUser: null,
  completedSteps: [],
  canGoBack: false,
  error: null,
};

// ============================================================================
// Reducer - Preserving Current Logic Patterns
// ============================================================================

function v3AuthReducer(state: V3AuthState, action: V3AuthAction): V3AuthState {
  const addCompletedStep = (step: V3AuthStep): V3AuthStep[] => [
    ...state.completedSteps.filter((s) => s !== step),
    step,
  ];

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

    // Sign-up flow transitions (preserving SignUp.tsx logic)
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
        // No need to track account creation as a completed step
      };

    case "PROFILE_CREATED":
      return {
        ...state,
        step: state.isArtist ? "firebase-backup" : "welcome",
        canGoBack: state.isArtist,
        completedSteps: addCompletedStep("profile-setup"),
      };

    case "FIREBASE_BACKUP_COMPLETE":
      return {
        ...state,
        step: "welcome",
        canGoBack: false,
        completedSteps: addCompletedStep("firebase-backup"),
      };

    // Sign-in flow transitions (preserving SignIn.tsx logic)
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
        firebaseUser: action.firebaseUser,
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
// Main Hook - Encapsulating Side Effects and Business Logic
// ============================================================================

export function useV3AuthFlow() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(v3AuthReducer, initialState);

  // Existing hooks - reusing all current logic
  const { user, logout, metadata } = useCurrentUser();
  const { settings, updateSettings, hasSettingsEvent } = useAppSettings();
  const { data: legacyArtists, isLoading: isLoadingLegacyArtists } =
    useLegacyArtists();
  const { primaryPubkey } = useLinkedPubkeys();
  const { autoLink } = useAutoLinkPubkey();
  const { createAccount, isCreating } = useV3CreateAccount();

  // ============================================================================
  // Business Logic - Preserving Current Implementation
  // ============================================================================

  // Artist detection logic (from SignIn.tsx)
  const artistsList = legacyArtists?.artists ?? [];
  const isLegacyArtist = artistsList.length > 0;
  const finalIsArtist = settings?.isArtist ?? isLegacyArtist;

  // ============================================================================
  // Action Handlers - Wrapping Existing Logic
  // ============================================================================

  const handleBack = useCallback(() => {
    if (state.canGoBack) {
      dispatch({ type: "GO_BACK" });
    }
  }, [state.canGoBack]);

  const handleSelectSignup = useCallback(() => {
    dispatch({ type: "SELECT_SIGNUP" });
  }, []);

  const handleSelectSignin = useCallback(() => {
    dispatch({ type: "SELECT_SIGNIN" });
  }, []);

  const handleSelectLegacyAuth = useCallback(() => {
    dispatch({ type: "SELECT_LEGACY_AUTH" });
  }, []);

  const handleSetUserType = useCallback(
    async (isArtist: boolean) => {
      dispatch({ type: "SET_USER_TYPE", isArtist });

      // For listeners, create account immediately since they skip artist-type step
      if (!isArtist) {
        try {
          await createAccount();
          dispatch({ type: "ACCOUNT_CREATED" });
        } catch (error) {
          console.error("Account creation failed:", error);
          dispatch({
            type: "SET_ERROR",
            error: "Failed to create account. Please try again.",
          });
        }
      }
    },
    [createAccount]
  );

  const handleSetArtistType = useCallback(
    async (isSoloArtist: boolean) => {
      dispatch({ type: "SET_ARTIST_TYPE", isSoloArtist });

      // Create account immediately after artist type selection so EditProfileForm has a user
      try {
        await createAccount();
        dispatch({ type: "ACCOUNT_CREATED" });
      } catch (error) {
        console.error("Account creation failed:", error);
        dispatch({
          type: "SET_ERROR",
          error: "Failed to create account. Please try again.",
        });
      }
    },
    [createAccount]
  );

  const handleNostrAuthComplete = useCallback(() => {
    dispatch({ type: "NOSTR_AUTH_COMPLETE" });
  }, []);

  const handleLegacyAuthComplete = useCallback((firebaseUser: FirebaseUser) => {
    dispatch({ type: "LEGACY_AUTH_COMPLETE", firebaseUser });
  }, []);

  const handleAccountLinkingComplete = useCallback(() => {
    dispatch({ type: "ACCOUNT_LINKING_COMPLETE" });
  }, []);

  const handleProfileCreated = useCallback(() => {
    dispatch({ type: "PROFILE_CREATED" });
  }, []);

  const handleFirebaseBackupComplete = useCallback(
    async (firebaseUser: FirebaseUser) => {
      // Auto-link logic from SignUp.tsx
      if (user && firebaseUser) {
        try {
          await autoLink(firebaseUser, user.pubkey);
        } catch (error) {
          console.error("Auto-linking failed:", error);
          // Continue anyway - linking is optional
        }
      }
      dispatch({ type: "FIREBASE_BACKUP_COMPLETE" });
    },
    [autoLink, user]
  );

  const handleWelcomeComplete = useCallback(async () => {
    // Settings initialization logic (from SignIn.tsx and SignUp.tsx)
    try {
      // Create settings event if none exists (from SignIn.tsx welcome logic)
      if (!hasSettingsEvent) {
        await updateSettings({ isArtist: state.isArtist || finalIsArtist });
      }

      // Navigation logic (preserving current patterns)
      if (state.isArtist || finalIsArtist) {
        navigate("/dashboard");
      } else {
        navigate("/groups");
      }

      dispatch({ type: "WELCOME_COMPLETE" });
    } catch (error) {
      console.error("Welcome completion failed:", error);
      dispatch({
        type: "SET_ERROR",
        error: "Failed to complete setup. Please try again.",
      });
    }
  }, [
    hasSettingsEvent,
    updateSettings,
    state.isArtist,
    finalIsArtist,
    navigate,
  ]);

  // Reset function
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Error handling
  const setError = useCallback((error: string) => {
    dispatch({ type: "SET_ERROR", error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // Current state
    step: state.step,
    isArtist: state.isArtist,
    isSoloArtist: state.isSoloArtist,
    firebaseUser: state.firebaseUser,
    canGoBack: state.canGoBack,
    error: state.error,

    // Current user data (from existing hooks)
    currentUser: user,
    metadata,
    isLegacyArtist,
    primaryPubkey,
    artistsList,
    isLoadingLegacyArtists,
    isCreating,

    // Actions
    handleBack,
    handleSelectSignup,
    handleSelectSignin,
    handleSelectLegacyAuth,
    handleSetUserType,
    handleSetArtistType,
    handleNostrAuthComplete,
    handleLegacyAuthComplete,
    handleAccountLinkingComplete,
    handleProfileCreated,
    handleFirebaseBackupComplete,
    handleWelcomeComplete,

    // Utilities
    reset,
    setError,
    clearError,
    logout,
  };
}
