/**
 * Account Linking Flow Business Logic Hook
 *
 * This hook manages account linking operations including:
 * - Firebase-Nostr account linking
 * - Legacy account migration
 * - Auto-linking functionality
 * - Profile synchronization
 */

import { useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { NUser } from "@nostrify/react/login";
import { useLinkedPubkeys } from "@/hooks/useLinkedPubkeys";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { V3AuthStep } from "./useAuthFlowState";
import type { LinkedPubkey } from "@/types/auth";

// ============================================================================
// Types
// ============================================================================

export interface UseAccountLinkingFlowOptions {
  // Current state from state machine
  step: V3AuthStep;
  firebaseUser: FirebaseUser | null;
  
  // State update functions
  setError: (error: string) => void;
  accountLinkingComplete: () => void;
}

export interface UseAccountLinkingFlowResult {
  // Current linking state
  isLinking: boolean;
  linkingError: string | null;
  
  // Account data
  linkedAccounts: LinkedPubkey[];
  primaryPubkey: LinkedPubkey | null;
  currentUser: NUser | undefined;
  
  // Loading states
  isLoadingLinkedAccounts: boolean;
  
  // Action handlers
  handleAccountLinkingComplete: () => void;
  
  // Manual linking operations
  linkAccount: (firebaseUser: FirebaseUser, pubkey: string) => Promise<void>;
  unlinkAccount: (pubkey: string) => Promise<void>;
  
  // Helper functions
  canLink: (firebaseUser: FirebaseUser, pubkey: string) => boolean;
  hasLinkedAccounts: boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Manages account linking flow business logic
 * 
 * This hook handles all account linking operations, providing a clean interface
 * for linking Firebase accounts to Nostr accounts and managing the linking state.
 * 
 * @example
 * ```tsx
 * const linkingFlow = useAccountLinkingFlow({
 *   step,
 *   firebaseUser,
 *   setError,
 *   accountLinkingComplete,
 * });
 * 
 * // In account-linking step
 * <NostrAuthForm 
 *   expectedPubkey={linkingFlow.primaryPubkey?.pubkey}
 *   onComplete={linkingFlow.handleAccountLinkingComplete} 
 * />
 * ```
 */
export function useAccountLinkingFlow({
  step,
  firebaseUser,
  setError,
  accountLinkingComplete,
}: UseAccountLinkingFlowOptions): UseAccountLinkingFlowResult {
  
  // External hooks for linking operations
  const { 
    data: linkedAccounts, 
    isLoading: isLoadingLinkedAccounts,
    primaryPubkey 
  } = useLinkedPubkeys(firebaseUser || undefined);
  
  const { 
    autoLink, 
    isLinking, 
    lastError 
  } = useAutoLinkPubkey();
  
  const linkingError = lastError?.message || null;
  
  const { user: currentUser } = useCurrentUser();

  // ============================================================================
  // Account Linking Handlers
  // ============================================================================

  /**
   * Handle account linking completion
   * Called when Nostr authentication is complete during linking flow
   */
  const handleAccountLinkingComplete = useCallback(() => {
    try {
      accountLinkingComplete();
    } catch (error) {
      console.error("Account linking completion failed:", error);
      setError("Failed to complete account linking. Please try again.");
    }
  }, [accountLinkingComplete, setError]);

  /**
   * Manual account linking operation
   * Links a specific Firebase user to a Nostr pubkey
   */
  const linkAccount = useCallback(
    async (targetFirebaseUser: FirebaseUser, pubkey: string) => {
      try {
        if (!targetFirebaseUser || !pubkey) {
          throw new Error("Missing required parameters for linking");
        }

        await autoLink(targetFirebaseUser, pubkey);
      } catch (error) {
        console.error("Manual account linking failed:", error);
        setError("Failed to link accounts. Please try again.");
        throw error;
      }
    },
    [autoLink, setError]
  );

  /**
   * Unlink account operation
   * Removes link between Firebase user and Nostr pubkey
   */
  const unlinkAccount = useCallback(
    async (pubkey: string) => {
      try {
        if (!pubkey) {
          throw new Error("Pubkey is required for unlinking");
        }

        // Note: Unlinking functionality would need to be implemented
        // in the useAutoLinkPubkey hook or a separate hook
        console.warn("Unlink functionality not implemented yet");
        setError("Unlink functionality is not yet available.");
      } catch (error) {
        console.error("Account unlinking failed:", error);
        setError("Failed to unlink account. Please try again.");
        throw error;
      }
    },
    [setError]
  );

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Check if a Firebase user can be linked to a specific pubkey
   */
  const canLink = useCallback(
    (targetFirebaseUser: FirebaseUser, pubkey: string): boolean => {
      if (!targetFirebaseUser || !pubkey) {
        return false;
      }

      // Check if this pubkey is already linked to this Firebase user
      const isAlreadyLinked = (linkedAccounts || []).some(
        account => account.pubkey === pubkey
      );

      return !isAlreadyLinked;
    },
    [linkedAccounts]
  );

  /**
   * Check if Firebase user has any linked accounts
   */
  const hasLinkedAccounts = (linkedAccounts || []).length > 0;

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // Current linking state
    isLinking,
    linkingError,
    
    // Account data
    linkedAccounts: linkedAccounts || [],
    primaryPubkey: primaryPubkey || null,
    currentUser,
    
    // Loading states
    isLoadingLinkedAccounts,
    
    // Action handlers
    handleAccountLinkingComplete,
    
    // Manual linking operations
    linkAccount,
    unlinkAccount,
    
    // Helper functions
    canLink,
    hasLinkedAccounts,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if current step requires account linking
 */
export function isAccountLinkingStep(step: V3AuthStep): boolean {
  return step === "account-linking";
}

/**
 * Get linking status description for UI
 */
export function getLinkingStatusDescription(
  hasLinkedAccounts: boolean,
  isLinking: boolean,
  linkingError: string | null
): string {
  if (linkingError) {
    return `Linking failed: ${linkingError}`;
  }
  
  if (isLinking) {
    return "Linking accounts...";
  }
  
  if (hasLinkedAccounts) {
    return "Accounts successfully linked";
  }
  
  return "Ready to link accounts";
}

/**
 * Validate linking requirements
 */
export function validateLinkingRequirements(
  firebaseUser: FirebaseUser | null,
  pubkey: string | null
): { isValid: boolean; error?: string } {
  if (!firebaseUser) {
    return { isValid: false, error: "Firebase authentication required" };
  }
  
  if (!pubkey) {
    return { isValid: false, error: "Nostr pubkey required" };
  }
  
  return { isValid: true };
}

/**
 * Get recommended next action based on linking state
 */
export function getRecommendedAction(
  hasLinkedAccounts: boolean,
  isLinking: boolean,
  linkingError: string | null
): "wait" | "retry" | "continue" | "authenticate" {
  if (isLinking) {
    return "wait";
  }
  
  if (linkingError) {
    return "retry";
  }
  
  if (hasLinkedAccounts) {
    return "continue";
  }
  
  return "authenticate";
}

/**
 * Format account display information
 */
export function formatAccountInfo(account: LinkedPubkey): {
  displayName: string;
  identifier: string;
} {
  const displayName = account.profile?.name || 
                     account.profile?.display_name || 
                     "Unknown User";
  
  const identifier = account.pubkey ? 
                    `...${account.pubkey.slice(-8)}` : 
                    "No ID";
  
  return { displayName, identifier };
}