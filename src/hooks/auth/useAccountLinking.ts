/**
 * Account linking hook
 * 
 * This hook handles linking and unlinking Nostr accounts with Firebase accounts,
 * extracted from the legacy auto-linking system and providing a cleaner interface.
 */

import { useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useAutoLinkPubkey } from '@/hooks/legacy/useLegacyAutoLinkPubkey';
import { toast } from '@/hooks/useToast';
import type { AccountLinkingResult } from '@/types/authFlow';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Get user-friendly error message for linking failures
 */
function getLinkingErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('duplicate') || message.includes('already linked')) {
      return 'This account is already linked to your profile.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to link accounts. Please check your connection and try again.';
    }
    if (message.includes('authentication') || message.includes('token')) {
      return 'Session expired. Please sign in again to link accounts.';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid account information. Please check and try again.';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You do not have permission to link this account.';
    }
    
    return 'Unable to link accounts. Please try again.';
  }
  
  return 'An unexpected error occurred while linking accounts.';
}

/**
 * Get user-friendly error message for unlinking failures
 */
function getUnlinkingErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found') || message.includes('not linked')) {
      return 'This account is not linked to your profile.';
    }
    if (message.includes('last account') || message.includes('primary')) {
      return 'Cannot unlink your primary account. Link another account first.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to unlink account. Please check your connection and try again.';
    }
    if (message.includes('authentication') || message.includes('token')) {
      return 'Session expired. Please sign in again to unlink accounts.';
    }
    
    return 'Unable to unlink account. Please try again.';
  }
  
  return 'An unexpected error occurred while unlinking account.';
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate pubkey format for linking
 */
function validatePubkey(pubkey: string): { isValid: boolean; error?: string } {
  if (!pubkey || typeof pubkey !== 'string') {
    return { isValid: false, error: 'Account identifier is required' };
  }
  
  if (pubkey.length !== 64) {
    return { isValid: false, error: 'Invalid account identifier length' };
  }
  
  if (!/^[a-f0-9]{64}$/i.test(pubkey)) {
    return { isValid: false, error: 'Invalid account identifier format' };
  }
  
  return { isValid: true };
}

/**
 * Validate Firebase user for linking operations
 */
function validateFirebaseUser(firebaseUser: FirebaseUser): { isValid: boolean; error?: string } {
  if (!firebaseUser) {
    return { isValid: false, error: 'You must be signed in to link accounts' };
  }
  
  if (!firebaseUser.uid) {
    return { isValid: false, error: 'Invalid user session' };
  }
  
  return { isValid: true };
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Account linking hook
 * 
 * This hook provides functionality to link and unlink Nostr accounts with
 * Firebase accounts. It's extracted from the legacy auto-linking system
 * and provides a cleaner, more focused interface.
 * 
 * Features:
 * - Link Nostr accounts to Firebase accounts
 * - Unlink accounts with validation
 * - Comprehensive error handling
 * - Cache invalidation after operations
 * - User-friendly notifications
 * 
 * @param options - Configuration options for linking behavior
 * 
 * @example
 * ```tsx
 * function AccountLinkingScreen({ firebaseUser, pubkey }) {
 *   const { linkAccount, unlinkAccount, isLinking, error } = useAccountLinking({
 *     showNotifications: true
 *   });
 *   
 *   const handleLink = async () => {
 *     try {
 *       await linkAccount(firebaseUser, pubkey);
 *       onLinkingComplete();
 *     } catch (error) {
 *       // Error is already handled by the hook
 *     }
 *   };
 * }
 * ```
 */
export function useAccountLinking(options: {
  showNotifications?: boolean;
} = {}): AccountLinkingResult {
  const { showNotifications = true } = options;
  
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Use the legacy auto-link hook for the actual linking logic
  const { autoLink } = useAutoLinkPubkey({
    showNotifications: false, // We'll handle notifications ourselves
  });

  /**
   * Link a Nostr account to a Firebase account
   */
  const linkAccount = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey: string
  ) => {
    if (isLinking) {
      throw new Error('Account linking already in progress');
    }

    // Validate inputs
    const userValidation = validateFirebaseUser(firebaseUser);
    if (!userValidation.isValid) {
      const errorMessage = userValidation.error!;
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    const pubkeyValidation = validatePubkey(pubkey);
    if (!pubkeyValidation.isValid) {
      const errorMessage = pubkeyValidation.error!;
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsLinking(true);
    setError(null);

    try {
      // Use the legacy auto-link system
      const result = await autoLink(firebaseUser, pubkey.trim());
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Linking failed');
      }

      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['linked-pubkeys', firebaseUser.uid] 
      });

      // Emit event for other components
      window.dispatchEvent(new CustomEvent('account-linked', { 
        detail: { 
          pubkey: pubkey.trim(),
          firebaseUid: firebaseUser.uid,
          success: true,
        } 
      }));

      // Show success notification
      if (showNotifications) {
        toast.success('Account Linked', {
          description: 'Your Nostr account has been successfully linked.',
        });
      }

      setIsLinking(false);

    } catch (error) {
      const errorMessage = getLinkingErrorMessage(error);
      setError(errorMessage);
      setIsLinking(false);

      // Show error notification
      if (showNotifications) {
        const isDuplicate = errorMessage.includes('already linked');
        
        if (isDuplicate) {
          toast.warning('Account Already Linked', {
            description: errorMessage,
          });
        } else {
          toast.error('Linking Failed', {
            description: errorMessage,
          });
        }
      }

      throw new Error(errorMessage);
    }
  }, [isLinking, autoLink, queryClient, showNotifications]);

  /**
   * Unlink a Nostr account from the current Firebase account
   * 
   * Note: This is a placeholder implementation as the legacy system
   * doesn't have a direct unlink function. In a real implementation,
   * this would call an API endpoint to remove the link.
   */
  const unlinkAccount = useCallback(async (pubkey: string) => {
    if (isLinking) {
      throw new Error('Account operation already in progress');
    }

    const pubkeyValidation = validatePubkey(pubkey);
    if (!pubkeyValidation.isValid) {
      const errorMessage = pubkeyValidation.error!;
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsLinking(true);
    setError(null);

    try {
      // TODO: Implement actual unlinking API call
      // This is a placeholder that demonstrates the pattern
      // const response = await unlinkPubkeyFromFirebase(pubkey);
      
      // For now, throw an error indicating the feature is not implemented
      throw new Error('Account unlinking is not yet implemented');

      // When implemented, the flow would be:
      // 1. Call API to unlink
      // 2. Invalidate cache
      // 3. Emit event
      // 4. Show notification
      // 5. Return success

    } catch (error) {
      const errorMessage = getUnlinkingErrorMessage(error);
      setError(errorMessage);
      setIsLinking(false);

      if (showNotifications) {
        toast.error('Unlinking Failed', {
          description: errorMessage,
        });
      }

      throw new Error(errorMessage);
    }
  }, [isLinking, showNotifications]);

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    linkAccount,
    unlinkAccount,
    isLinking,
    error,
    clearError,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a pubkey is already linked to the Firebase user
 */
export function isAccountLinked(
  pubkey: string,
  linkedAccounts: Array<{ pubkey: string }>
): boolean {
  return linkedAccounts.some(account => account.pubkey === pubkey);
}

/**
 * Get linking status for UI display
 */
export function getLinkingStatus(
  isLinking: boolean,
  error: string | null
): 'idle' | 'linking' | 'success' | 'error' {
  if (error) return 'error';
  if (isLinking) return 'linking';
  return 'idle';
}

/**
 * Validate if account can be unlinked (not the last/primary account)
 */
export function canUnlinkAccount(
  pubkey: string,
  linkedAccounts: Array<{ pubkey: string; isPrimary?: boolean }>
): { canUnlink: boolean; reason?: string } {
  if (linkedAccounts.length <= 1) {
    return {
      canUnlink: false,
      reason: 'Cannot unlink your only linked account'
    };
  }

  const account = linkedAccounts.find(acc => acc.pubkey === pubkey);
  if (account?.isPrimary && linkedAccounts.length === 1) {
    return {
      canUnlink: false,
      reason: 'Cannot unlink your primary account'
    };
  }

  return { canUnlink: true };
}