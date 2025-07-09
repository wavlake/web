/**
 * Account discovery hook
 * 
 * This hook handles the discovery of linked Nostr accounts and legacy profile data
 * after Firebase authentication, extracted from the legacy ProfileDiscoveryScreen.
 */

import { useState, useCallback, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useQuery } from '@tanstack/react-query';
import { useLinkedPubkeys } from '@/hooks/legacy/useLegacyLinkedPubkeys';
import { useLegacyProfile } from '@/hooks/useLegacyProfile';
import type { 
  AccountDiscoveryResult, 
  LinkedAccount, 
  LegacyProfile 
} from '@/types/authFlow';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Get user-friendly error message for discovery failures
 */
function getDiscoveryErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to load your accounts. Please check your connection and try again.';
    }
    if (message.includes('authentication') || message.includes('token')) {
      return 'Session expired. Please sign in again.';
    }
    if (message.includes('timeout')) {
      return 'Loading timed out. Please try again.';
    }
    
    return 'Unable to load your account information. Please try again.';
  }
  
  return 'An unexpected error occurred while loading your accounts.';
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform legacy linked pubkeys response to unified format
 */
function transformLinkedPubkeys(legacyPubkeys: any[]): LinkedAccount[] {
  if (!Array.isArray(legacyPubkeys)) {
    return [];
  }

  return legacyPubkeys.map((item) => ({
    pubkey: item.pubkey,
    profile: item.profile ? {
      name: item.profile.name,
      display_name: item.profile.display_name,
      picture: item.profile.picture,
      about: item.profile.about,
    } : undefined,
    linkedAt: item.linkedAt,
    isPrimary: item.isPrimary || false,
  }));
}

/**
 * Transform legacy profile data to unified format
 */
function transformLegacyProfile(legacyData: any): LegacyProfile | null {
  if (!legacyData) {
    return null;
  }

  return {
    email: legacyData.email,
    displayName: legacyData.displayName,
    photoURL: legacyData.photoURL,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Account discovery hook
 * 
 * This hook handles the discovery of linked Nostr accounts and legacy profile
 * data after successful Firebase authentication. It's extracted from the legacy
 * ProfileDiscoveryScreen component and focuses purely on data fetching.
 * 
 * Features:
 * - Discover linked Nostr accounts
 * - Fetch legacy profile data
 * - Performance optimization for new users
 * - Comprehensive error handling
 * - Manual refresh capability
 * 
 * @param firebaseUser - Firebase user to discover accounts for
 * @param isNewUser - Skip API calls for new users (performance optimization)
 * 
 * @example
 * ```tsx
 * function AccountDiscoveryScreen({ firebaseUser, isNewUser }) {
 *   const { linkedAccounts, legacyProfile, isLoading, error, refresh } = useAccountDiscovery(firebaseUser, isNewUser);
 *   
 *   if (isLoading) return <div>Loading your accounts...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return (
 *     <div>
 *       <h2>Found {linkedAccounts.length} linked accounts</h2>
 *       {legacyProfile && <div>Legacy profile: {legacyProfile.displayName}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccountDiscovery(
  firebaseUser?: FirebaseUser,
  isNewUser: boolean = false
): AccountDiscoveryResult {
  const [error, setError] = useState<string | null>(null);
  const [manualRefreshCount, setManualRefreshCount] = useState(0);

  // Fetch linked pubkeys (skip for new users for performance)
  const linkedPubkeysQuery = useLinkedPubkeys(firebaseUser, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!firebaseUser && !isNewUser,
  });

  // Fetch legacy profile data (skip for new users for performance)
  const legacyProfileQuery = useLegacyProfile(firebaseUser?.email, firebaseUser, {
    enabled: !!firebaseUser && !isNewUser,
  });

  // Transform data to unified format
  const linkedAccounts = transformLinkedPubkeys(linkedPubkeysQuery.data || []);
  const legacyProfile = transformLegacyProfile(legacyProfileQuery.data);

  // Determine overall loading state
  const isLoading = (
    linkedPubkeysQuery.isLoading || 
    legacyProfileQuery.isLoading
  ) && !isNewUser;

  // Handle errors from either query
  useEffect(() => {
    const linkedError = linkedPubkeysQuery.error;
    const profileError = legacyProfileQuery.error;
    
    if (linkedError || profileError) {
      const primaryError = linkedError || profileError;
      const errorMessage = getDiscoveryErrorMessage(primaryError);
      setError(errorMessage);
    } else {
      setError(null);
    }
  }, [linkedPubkeysQuery.error, legacyProfileQuery.error]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    setError(null);
    setManualRefreshCount(prev => prev + 1);
    
    if (!isNewUser) {
      linkedPubkeysQuery.refetch();
      legacyProfileQuery.refetch();
    }
  }, [isNewUser, linkedPubkeysQuery, legacyProfileQuery]);

  // For new users, return empty data immediately (performance optimization)
  if (isNewUser) {
    return {
      linkedAccounts: [],
      legacyProfile: null,
      isLoading: false,
      error: null,
      refresh,
    };
  }

  return {
    linkedAccounts,
    legacyProfile,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if user has any linked accounts
 */
export function useHasLinkedAccounts(firebaseUser?: FirebaseUser, isNewUser: boolean = false): boolean {
  const { linkedAccounts } = useAccountDiscovery(firebaseUser, isNewUser);
  return linkedAccounts.length > 0;
}

/**
 * Hook to get primary linked account
 */
export function usePrimaryLinkedAccount(firebaseUser?: FirebaseUser, isNewUser: boolean = false): LinkedAccount | null {
  const { linkedAccounts } = useAccountDiscovery(firebaseUser, isNewUser);
  return linkedAccounts.find(account => account.isPrimary) || linkedAccounts[0] || null;
}

/**
 * Hook to check discovery status
 */
export function useDiscoveryStatus(firebaseUser?: FirebaseUser, isNewUser: boolean = false) {
  const { linkedAccounts, legacyProfile, isLoading, error } = useAccountDiscovery(firebaseUser, isNewUser);
  
  return {
    hasLinkedAccounts: linkedAccounts.length > 0,
    hasLegacyProfile: !!legacyProfile,
    hasMultipleAccounts: linkedAccounts.length > 1,
    accountCount: linkedAccounts.length,
    isLoading,
    hasError: !!error,
    isEmpty: !isLoading && linkedAccounts.length === 0 && !legacyProfile,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display name for a linked account
 */
export function getAccountDisplayName(account: LinkedAccount): string {
  return (
    account.profile?.name ||
    account.profile?.display_name ||
    `${account.pubkey.slice(0, 8)}...${account.pubkey.slice(-8)}`
  );
}

/**
 * Get account avatar URL
 */
export function getAccountAvatarUrl(account: LinkedAccount): string | undefined {
  return account.profile?.picture;
}

/**
 * Sort accounts by priority (primary first, then by linking date)
 */
export function sortAccountsByPriority(accounts: LinkedAccount[]): LinkedAccount[] {
  return [...accounts].sort((a, b) => {
    // Primary accounts first
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    
    // Then by linking date (most recent first)
    if (a.linkedAt && b.linkedAt) {
      return b.linkedAt - a.linkedAt;
    }
    
    // Accounts with linking date before those without
    if (a.linkedAt && !b.linkedAt) return -1;
    if (!a.linkedAt && b.linkedAt) return 1;
    
    return 0;
  });
}

/**
 * Check if account discovery should be skipped for performance
 */
export function shouldSkipDiscovery(isNewUser: boolean, firebaseUser?: FirebaseUser): boolean {
  return isNewUser || !firebaseUser;
}