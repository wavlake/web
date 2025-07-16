/**
 * Authentication Flow Coordinator Hook
 *
 * This hook orchestrates all the decomposed auth flow hooks and provides
 * a unified interface that maintains backward compatibility with the
 * original useV3AuthFlow API while using the new modular architecture.
 */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NUser } from "@nostrify/react/login";
import useAppSettings from "@/hooks/useAppSettings";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthFlowState, type V3AuthStep } from "./useAuthFlowState";
import { useSignupFlow } from "./useSignupFlow";
import { useSigninFlow } from "./useSigninFlow";
import type { LinkedPubkey, NostrProfile } from "@/types/auth";

// ============================================================================
// Types
// ============================================================================

export interface UseAuthFlowCoordinatorResult {
  // State from state machine
  step: V3AuthStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  canGoBack: boolean;
  error: string | null;

  // Current user data
  currentUser: NUser | undefined;
  metadata: NostrProfile | undefined;
  isLegacyArtist: boolean;
  primaryPubkey: LinkedPubkey | null;
  artistsList: unknown[];
  isLoadingLegacyArtists: boolean;
  isCreating: boolean;

  // Settings data
  hasSettingsEvent: boolean;

  // Action handlers - maintaining original API
  handleBack: () => void;
  handleSelectSignup: () => void;
  handleSelectSignin: () => void;
  handleSelectLegacyAuth: () => void;
  handleSelectAccountGeneration: () => void;
  handleSetUserType: (isArtist: boolean) => Promise<void>;
  handleSetArtistType: (isSoloArtist: boolean) => Promise<void>;
  handleNostrAuthComplete: () => void;
  handleLegacyAuthComplete: () => void;
  handleAccountLinkingComplete: () => void;
  handleAccountGenerationComplete: () => void;
  handleProfileCreated: () => void;
  handleFirebaseBackupComplete: () => Promise<void>;
  handleWelcomeComplete: () => Promise<void>;

  // Utilities - maintaining original API
  reset: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  logout: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Coordinates all auth flow hooks and provides unified interface
 *
 * This hook maintains backward compatibility with the original useV3AuthFlow
 * interface while using the new modular architecture under the hood.
 *
 * @example
 * ```tsx
 * const authFlow = useAuthFlowCoordinator();
 *
 * // Same API as original useV3AuthFlow
 * if (authFlow.step === "method-selection") {
 *   return <MethodSelection onSignup={authFlow.handleSelectSignup} />;
 * }
 * ```
 */
export function useAuthFlowCoordinator(): UseAuthFlowCoordinatorResult {
  const navigate = useNavigate();
  const { logout, user: currentUser } = useCurrentUser();
  const { updateSettings, hasSettingsEvent, settings } = useAppSettings();

  // ============================================================================
  // Core State Management
  // ============================================================================

  const stateFlow = useAuthFlowState();
  const {
    step,
    isArtist,
    isSoloArtist,
    canGoBack,
    error,
    goBack,
    reset,
    setError,
    clearError,
    selectSignup,
    selectSignin,
    selectLegacyAuth,
    selectAccountGeneration,
    setUserType,
    setArtistType,
    profileCreated,
    firebaseBackupComplete,
    nostrAuthComplete,
    legacyAuthComplete,
    accountLinkingComplete,
    accountGenerationComplete,
    welcomeComplete,
  } = stateFlow;

  // ============================================================================
  // Business Logic Hooks
  // ============================================================================

  const signupFlow = useSignupFlow({
    step,
    isArtist,
    isSoloArtist,
    setError,
    setUserType,
    setArtistType,
    accountCreated: stateFlow.accountCreated,
    profileCreated,
    firebaseBackupComplete,
  });

  const signinFlow = useSigninFlow({
    step,
    isArtist,
    setError,
    nostrAuthComplete,
    legacyAuthComplete,
    selectLegacyAuth,
  });

  // ============================================================================
  // Completion and Navigation Logic
  // ============================================================================

  /**
   * Handle welcome step completion with settings initialization and navigation
   * This preserves the complex logic from the original implementation
   */
  const handleWelcomeComplete = useCallback(async () => {
    try {
      let finalIsArtist: boolean;

      if (hasSettingsEvent) {
        // Use existing settings
        finalIsArtist = settings?.isArtist ?? false;
      } else {
        // No settings found - need to check legacy artists first
        if (signinFlow.isLoadingLegacyArtists) {
          // Still loading legacy artists - show loading state instead of proceeding
          setError("Checking your account settings...");
          return;
        }

        // Legacy artists check complete - use results to determine artist status
        const legacyArtists = signinFlow.artistsList || [];
        finalIsArtist = legacyArtists.length > 0;

        // Create settings event based on legacy artist results
        await updateSettings({ isArtist: finalIsArtist });
      }

      // Clear any loading messages
      clearError();

      // Navigation logic based on final artist status
      navigate(finalIsArtist ? "/dashboard" : "/groups");

      welcomeComplete();
    } catch (error) {
      console.error("Welcome completion failed:", error);
      setError("Failed to complete setup. Please try again.");
    }
  }, [
    hasSettingsEvent,
    settings?.isArtist,
    updateSettings,
    signinFlow.artistsList,
    signinFlow.isLoadingLegacyArtists,
    navigate,
    welcomeComplete,
    setError,
    clearError,
  ]);

  // ============================================================================
  // Action Handler Wrappers
  // ============================================================================

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleSelectSignup = useCallback(() => {
    selectSignup();
  }, [selectSignup]);

  const handleSelectSignin = useCallback(() => {
    selectSignin();
  }, [selectSignin]);

  const handleSelectLegacyAuth = useCallback(() => {
    signinFlow.handleSelectLegacyAuth();
  }, [signinFlow]);

  const handleSelectAccountGeneration = useCallback(() => {
    selectAccountGeneration();
  }, [selectAccountGeneration]);

  const handleSetUserType = useCallback(
    async (selectedIsArtist: boolean) => {
      await signupFlow.handleSetUserType(selectedIsArtist);
    },
    [signupFlow]
  );

  const handleSetArtistType = useCallback(
    async (selectedIsSoloArtist: boolean) => {
      await signupFlow.handleSetArtistType(selectedIsSoloArtist);
    },
    [signupFlow]
  );

  const handleNostrAuthComplete = useCallback(() => {
    signinFlow.handleNostrAuthComplete();
  }, [signinFlow]);

  const handleLegacyAuthComplete = useCallback(() => {
    signinFlow.handleLegacyAuthComplete();
  }, [signinFlow]);

  const handleAccountLinkingComplete = useCallback(() => {
    try {
      accountLinkingComplete();
    } catch (error) {
      console.error("Account linking completion failed:", error);
      setError("Failed to complete account linking. Please try again.");
    }
  }, [accountLinkingComplete, setError]);

  const handleAccountGenerationComplete = useCallback(() => {
    try {
      accountGenerationComplete();
    } catch (error) {
      console.error("Account generation completion failed:", error);
      setError("Failed to complete account generation. Please try again.");
    }
  }, [accountGenerationComplete, setError]);

  const handleProfileCreated = useCallback(() => {
    signupFlow.handleProfileCreated();
  }, [signupFlow]);

  const handleFirebaseBackupComplete = useCallback(async () => {
    await signupFlow.handleFirebaseBackupComplete();
  }, [signupFlow]);

  // ============================================================================
  // Return Interface - Maintaining Original API
  // ============================================================================

  return {
    // State from state machine
    step,
    isArtist,
    isSoloArtist,
    canGoBack,
    error,

    // Current user data (from signin flow)
    currentUser: signinFlow.currentUser,
    metadata: signinFlow.metadata,
    isLegacyArtist: signinFlow.isLegacyArtist,
    primaryPubkey: signinFlow.primaryPubkey,
    artistsList: signinFlow.artistsList,
    isLoadingLegacyArtists: signinFlow.isLoadingLegacyArtists,
    isCreating: signupFlow.isCreating,

    // Settings data
    hasSettingsEvent,

    // Action handlers
    handleBack,
    handleSelectSignup,
    handleSelectSignin,
    handleSelectLegacyAuth,
    handleSelectAccountGeneration,
    handleSetUserType,
    handleSetArtistType,
    handleNostrAuthComplete,
    handleLegacyAuthComplete,
    handleAccountLinkingComplete,
    handleAccountGenerationComplete,
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current flow type based on step
 */
export function getCurrentFlowType(
  step: V3AuthStep
): "signup" | "signin" | "linking" | "generation" | "welcome" | "selection" {
  switch (step) {
    case "method-selection":
      return "selection";
    case "sign-up":
    case "artist-type":
    case "profile-setup":
    case "firebase-backup":
      return "signup";
    case "nostr-auth":
    case "legacy-auth":
      return "signin";
    case "account-linking":
      return "linking";
    case "account-generation":
      return "generation";
    case "welcome":
      return "welcome";
    default:
      return "selection";
  }
}

/**
 * Get progress percentage for current flow
 */
export function getFlowProgress(step: V3AuthStep, isArtist: boolean): number {
  const flowType = getCurrentFlowType(step);

  switch (flowType) {
    case "signup": {
      const steps = isArtist
        ? ["sign-up", "artist-type", "profile-setup", "firebase-backup"]
        : ["sign-up", "profile-setup"];
      const currentIndex = steps.indexOf(step);
      return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    }
    case "signin": {
      const steps = ["nostr-auth", "legacy-auth"];
      const currentIndex = steps.indexOf(step);
      return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    }
    case "linking":
      return 90; // Near completion
    case "generation":
      return 85; // Account generation step
    case "welcome":
      return 100;
    default:
      return 0;
  }
}

/**
 * Check if current step allows going back
 */
export function canGoBackFromStep(step: V3AuthStep): boolean {
  return !["method-selection", "welcome"].includes(step);
}
