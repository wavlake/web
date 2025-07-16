/**
 * Signup Flow Business Logic Hook
 *
 * This hook manages all signup-related business logic including:
 * - User type selection (artist vs listener)
 * - Artist type selection (solo vs band)
 * - Account creation
 * - Profile setup coordination
 * - Firebase backup integration
 */

import { useCallback, useMemo } from "react";
import { useV3CreateAccount } from "@/components/auth/v3/useV3CreateAccount";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import type { V3AuthStep } from "./useAuthFlowState";

// ============================================================================
// Types
// ============================================================================

export interface UseSignupFlowOptions {
  // Current state from state machine
  step: V3AuthStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  
  // State update functions
  setError: (error: string) => void;
  setUserType: (isArtist: boolean) => void;
  setArtistType: (isSoloArtist: boolean) => void;
  accountCreated: () => void;
  profileCreated: () => void;
  firebaseBackupComplete: () => void;
}

export interface UseSignupFlowResult {
  // Account creation state
  isCreating: boolean;
  
  // User type handlers
  handleSetUserType: (isArtist: boolean) => Promise<void>;
  handleSetArtistType: (isSoloArtist: boolean) => Promise<void>;
  
  // Profile and completion handlers
  handleProfileCreated: () => void;
  handleFirebaseBackupComplete: () => Promise<void>;
  
  // Helper functions for UI
  getProfileStepDescription: () => string;
  getProfileTitle: () => string;
  shouldShowFirebaseBackup: boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Manages signup flow business logic
 * 
 * This hook handles all the business logic for the signup flow including
 * account creation, user type selection, and profile setup. It coordinates
 * with the state machine hook to update flow state appropriately.
 * 
 * @example
 * ```tsx
 * const signupFlow = useSignupFlow({
 *   step,
 *   isArtist,
 *   isSoloArtist,
 *   setError,
 *   setUserType,
 *   setArtistType,
 *   accountCreated,
 *   profileCreated,
 *   firebaseBackupComplete,
 * });
 * 
 * // In sign-up step
 * <Button onClick={() => signupFlow.handleSetUserType(true)}>
 *   Artist
 * </Button>
 * ```
 */
export function useSignupFlow({
  step,
  isArtist,
  isSoloArtist,
  setError,
  setUserType,
  setArtistType,
  accountCreated,
  profileCreated,
  firebaseBackupComplete,
}: UseSignupFlowOptions): UseSignupFlowResult {
  
  // External hooks
  const { createAccount, isCreating } = useV3CreateAccount();
  const { autoLink } = useAutoLinkPubkey();
  const { user } = useCurrentUser();
  const { user: firebaseUser } = useFirebaseAuth();

  // ============================================================================
  // User Type Selection Handlers
  // ============================================================================

  /**
   * Handle user type selection (artist vs listener)
   * Creates account immediately for listeners since they skip artist-type step
   */
  const handleSetUserType = useCallback(
    async (selectedIsArtist: boolean) => {
      try {
        // Update state first
        setUserType(selectedIsArtist);

        // For listeners, create account immediately since they skip artist-type step
        if (!selectedIsArtist) {
          await createAccount();
          accountCreated();
        }
      } catch (error) {
        console.error("User type selection failed:", error);
        setError("Failed to process selection. Please try again.");
      }
    },
    [setUserType, createAccount, accountCreated, setError]
  );

  /**
   * Handle artist type selection (solo vs band)
   * Creates account immediately after selection so EditProfileForm has a user
   */
  const handleSetArtistType = useCallback(
    async (selectedIsSoloArtist: boolean) => {
      try {
        // Update state first
        setArtistType(selectedIsSoloArtist);

        // Create account immediately after artist type selection
        // so EditProfileForm has a user to work with
        await createAccount();
        accountCreated();
      } catch (error) {
        console.error("Artist type selection failed:", error);
        setError("Failed to create account. Please try again.");
      }
    },
    [setArtistType, createAccount, accountCreated, setError]
  );

  // ============================================================================
  // Profile and Completion Handlers
  // ============================================================================

  /**
   * Handle profile creation completion
   * Simple state transition without side effects
   */
  const handleProfileCreated = useCallback(() => {
    profileCreated();
  }, [profileCreated]);

  /**
   * Handle Firebase backup completion with auto-linking
   * Links Firebase account to Nostr account if possible
   */
  const handleFirebaseBackupComplete = useCallback(
    async () => {
      try {
        // Auto-link logic using global Firebase auth state
        if (user && firebaseUser) {
          try {
            await autoLink(firebaseUser, user.pubkey);
          } catch (error) {
            console.error("Auto-linking failed:", error);
            // Continue anyway - linking is optional for signup flow
          }
        }
        
        firebaseBackupComplete();
      } catch (error) {
        console.error("Firebase backup completion failed:", error);
        setError("Failed to complete backup setup. Please try again.");
      }
    },
    [autoLink, user, firebaseUser, firebaseBackupComplete, setError]
  );

  // ============================================================================
  // UI Helper Functions
  // ============================================================================

  /**
   * Get description text for profile setup step
   */
  const getProfileStepDescription = useCallback(() => {
    if (isArtist) {
      return isSoloArtist
        ? "This is your public solo artist profile that will be visible to others."
        : "This is your public band/group profile that will be visible to others. You'll be able to make individual member profiles later.";
    }
    return "This is your public user profile that will be visible to others.";
  }, [isArtist, isSoloArtist]);

  /**
   * Get title text for profile setup step
   */
  const getProfileTitle = useCallback(() => {
    if (isArtist) {
      return isSoloArtist
        ? "Create Solo Artist Profile"
        : "Create Band/Group Profile";
    }
    return "Create User Profile";
  }, [isArtist, isSoloArtist]);

  /**
   * Determine if Firebase backup step should be shown
   * Only shown for artists in the current flow
   */
  const shouldShowFirebaseBackup = useMemo(() => {
    return isArtist;
  }, [isArtist]);

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // Account creation state
    isCreating,
    
    // User type handlers
    handleSetUserType,
    handleSetArtistType,
    
    // Profile and completion handlers
    handleProfileCreated,
    handleFirebaseBackupComplete,
    
    // Helper functions for UI
    getProfileStepDescription,
    getProfileTitle,
    shouldShowFirebaseBackup,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if current step is part of signup flow
 */
export function isSignupStep(step: V3AuthStep): boolean {
  return [
    "sign-up",
    "artist-type", 
    "profile-setup",
    "firebase-backup"
  ].includes(step);
}

/**
 * Get next step in signup flow based on user selections
 */
export function getNextSignupStep(
  currentStep: V3AuthStep,
  isArtist: boolean
): V3AuthStep | null {
  switch (currentStep) {
    case "method-selection":
      return "sign-up";
    case "sign-up":
      return isArtist ? "artist-type" : "profile-setup";
    case "artist-type":
      return "profile-setup";
    case "profile-setup":
      return isArtist ? "firebase-backup" : "welcome";
    case "firebase-backup":
      return "welcome";
    default:
      return null;
  }
}

/**
 * Calculate progress percentage for signup flow
 */
export function getSignupProgress(
  step: V3AuthStep,
  isArtist: boolean
): number {
  const steps = isArtist
    ? ["sign-up", "artist-type", "profile-setup", "firebase-backup"]
    : ["sign-up", "profile-setup"];
  
  const currentIndex = steps.indexOf(step);
  if (currentIndex === -1) return 0;
  
  return ((currentIndex + 1) / steps.length) * 100;
}