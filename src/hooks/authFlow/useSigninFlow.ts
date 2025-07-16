/**
 * Signin Flow Business Logic Hook
 *
 * This hook manages all signin-related business logic including:
 * - Nostr authentication handling
 * - Legacy Firebase authentication
 * - Artist detection logic
 * - Settings synchronization
 */

import { useCallback, useMemo } from "react";
import { NUser } from "@nostrify/react/login";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useAppSettings from "@/hooks/useAppSettings";
import { useLegacyArtists } from "@/hooks/useLegacyApi";
import { useAccountLinkingStatus } from "@/hooks/useLinkedPubkeys";
import type { V3AuthStep } from "./useAuthFlowState";
import type { LinkedPubkey, NostrProfile } from "@/types/auth";

// ============================================================================
// Types
// ============================================================================

export interface UseSigninFlowOptions {
  // Current state from state machine
  step: V3AuthStep;
  isArtist: boolean;
  
  // State update functions
  setError: (error: string) => void;
  nostrAuthComplete: () => void;
  legacyAuthComplete: () => void;
  selectLegacyAuth: () => void;
}

export interface UseSigninFlowResult {
  // Current user data
  currentUser: NUser | undefined;
  metadata: NostrProfile | undefined;
  
  // Legacy artist detection
  isLegacyArtist: boolean;
  artistsList: unknown[];
  isLoadingLegacyArtists: boolean;
  
  // Account linking data
  primaryPubkey: LinkedPubkey | null;
  
  // Authentication handlers
  handleNostrAuthComplete: () => void;
  handleLegacyAuthComplete: () => void;
  handleSelectLegacyAuth: () => void;
  
  // Settings and navigation logic
  finalIsArtist: boolean;
  hasSettingsEvent: boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Manages signin flow business logic
 * 
 * This hook handles all the business logic for the signin flow including
 * Nostr authentication, legacy account migration, and artist detection.
 * It coordinates with external hooks to provide authentication data.
 * 
 * @example
 * ```tsx
 * const signinFlow = useSigninFlow({
 *   step,
 *   isArtist,
 *   firebaseUser,
 *   setError,
 *   nostrAuthComplete,
 *   legacyAuthComplete,
 *   selectLegacyAuth,
 * });
 * 
 * // In nostr-auth step
 * <NostrAuthForm onComplete={signinFlow.handleNostrAuthComplete} />
 * ```
 */
export function useSigninFlow({
  step,
  isArtist,
  setError,
  nostrAuthComplete,
  legacyAuthComplete,
  selectLegacyAuth,
}: UseSigninFlowOptions): UseSigninFlowResult {
  
  // External hooks for authentication and user data
  const { user, metadata } = useCurrentUser();
  const { settings, hasSettingsEvent } = useAppSettings();
  const { data: legacyArtists, isLoading: isLoadingLegacyArtists } = useLegacyArtists();
  const { primaryPubkey } = useAccountLinkingStatus();

  // ============================================================================
  // Artist Detection Logic
  // ============================================================================

  /**
   * Detect if user has legacy artist accounts
   * Based on legacy API data
   */
  const artistsList = useMemo(() => {
    return legacyArtists?.artists ?? [];
  }, [legacyArtists]);

  const isLegacyArtist = useMemo(() => {
    return artistsList.length > 0;
  }, [artistsList]);

  /**
   * Determine final artist status
   * Combines current state with legacy detection and settings
   */
  const finalIsArtist = useMemo(() => {
    return settings?.isArtist ?? isLegacyArtist;
  }, [settings?.isArtist, isLegacyArtist]);

  // ============================================================================
  // Authentication Handlers
  // ============================================================================

  /**
   * Handle Nostr authentication completion
   * Simple state transition for successful Nostr auth
   */
  const handleNostrAuthComplete = useCallback(() => {
    try {
      nostrAuthComplete();
    } catch (error) {
      console.error("Nostr auth completion failed:", error);
      setError("Failed to complete authentication. Please try again.");
    }
  }, [nostrAuthComplete, setError]);

  /**
   * Handle legacy Firebase authentication completion
   * Transitions to account linking step
   */
  const handleLegacyAuthComplete = useCallback(() => {
    try {
      legacyAuthComplete();
    } catch (error) {
      console.error("Legacy auth completion failed:", error);
      setError("Failed to complete legacy authentication. Please try again.");
    }
  }, [legacyAuthComplete, setError]);

  /**
   * Handle legacy authentication selection
   * Transitions from Nostr auth to Firebase auth
   */
  const handleSelectLegacyAuth = useCallback(() => {
    try {
      selectLegacyAuth();
    } catch (error) {
      console.error("Legacy auth selection failed:", error);
      setError("Failed to switch authentication method. Please try again.");
    }
  }, [selectLegacyAuth, setError]);

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // Current user data
    currentUser: user,
    metadata,
    
    // Legacy artist detection
    isLegacyArtist,
    artistsList,
    isLoadingLegacyArtists,
    
    // Account linking data
    primaryPubkey: primaryPubkey || null,
    
    // Authentication handlers
    handleNostrAuthComplete,
    handleLegacyAuthComplete,
    handleSelectLegacyAuth,
    
    // Settings and navigation logic
    finalIsArtist,
    hasSettingsEvent,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if current step is part of signin flow
 */
export function isSigninStep(step: V3AuthStep): boolean {
  return [
    "nostr-auth",
    "legacy-auth",
    "account-linking"
  ].includes(step);
}

/**
 * Get next step in signin flow
 */
export function getNextSigninStep(
  currentStep: V3AuthStep,
  hasLegacyAccounts: boolean
): V3AuthStep | null {
  switch (currentStep) {
    case "method-selection":
      return "nostr-auth";
    case "nostr-auth":
      // Can go to legacy auth for migration or directly to welcome
      return "welcome";
    case "legacy-auth":
      return "account-linking";
    case "account-linking":
      return "welcome";
    default:
      return null;
  }
}

/**
 * Calculate progress percentage for signin flow
 */
export function getSigninProgress(
  step: V3AuthStep,
  isLegacyFlow: boolean
): number {
  const steps = isLegacyFlow
    ? ["nostr-auth", "legacy-auth", "account-linking"]
    : ["nostr-auth"];
  
  const currentIndex = steps.indexOf(step);
  if (currentIndex === -1) return 0;
  
  return ((currentIndex + 1) / steps.length) * 100;
}

/**
 * Determine if user should see legacy migration option
 */
export function shouldShowLegacyMigration(
  step: V3AuthStep,
  isLegacyArtist: boolean
): boolean {
  return step === "nostr-auth" && isLegacyArtist;
}

/**
 * Get authentication method description for UI
 */
export function getAuthMethodDescription(step: V3AuthStep): string {
  switch (step) {
    case "nostr-auth":
      return "Sign in with your Nostr account using an extension, private key, or remote signer.";
    case "legacy-auth":
      return "Sign in with your existing Wavlake email and password to migrate your account.";
    case "account-linking":
      return "Link your existing account with a new Nostr identity.";
    default:
      return "";
  }
}