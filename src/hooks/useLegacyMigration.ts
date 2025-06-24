import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import type { NostrEvent } from "@nostrify/nostrify";

import { useCurrentUser } from "./useCurrentUser";
import {
  initializeFirebasePublishing,
  isPublishingConfigured,
} from "@/lib/firebasePublishing";

// Catalog API base URL - use proxy in development to avoid CSP issues
const CATALOG_API_BASE_URL = import.meta.env.DEV 
  ? "/api/catalog"
  : import.meta.env.VITE_CATALOG_API_URL || "http://localhost:3210/v1";

interface LegacyMigrationState {
  isLegacyUser: boolean;
  needsMigration: boolean;
  isLoading: boolean;
  error: string | null;
  legacyFirebaseToken: string | null;
}

/**
 * Hook for managing legacy Firebase user migration
 * Detects if user needs to migrate from Firebase-only to hybrid auth
 */
export function useLegacyMigration() {
  const { user: nostrUser } = useCurrentUser();
  const [migrationState, setMigrationState] = useState<LegacyMigrationState>({
    isLegacyUser: false,
    needsMigration: false,
    isLoading: true,
    error: null,
    legacyFirebaseToken: null,
  });

  // Check for legacy Firebase user on mount
  useEffect(() => {
    if (!isPublishingConfigured()) {
      setMigrationState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const { auth } = initializeFirebasePublishing();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !nostrUser) {
        // User is signed into Firebase but not Nostr = legacy user
        try {
          const token = await firebaseUser.getIdToken();
          
          // Check if this Firebase user has any linked Nostr pubkeys
          const response = await fetch(`${CATALOG_API_BASE_URL}/auth/check-migration`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const { hasLinkedPubkeys } = await response.json();
            
            setMigrationState({
              isLegacyUser: true,
              needsMigration: !hasLinkedPubkeys,
              isLoading: false,
              error: null,
              legacyFirebaseToken: token,
            });
          } else {
            throw new Error('Failed to check migration status');
          }
        } catch (error) {
          console.error('Migration check failed:', error);
          setMigrationState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Migration check failed',
          }));
        }
      } else {
        // Not a legacy user scenario
        setMigrationState(prev => ({
          ...prev,
          isLegacyUser: false,
          needsMigration: false,
          isLoading: false,
        }));
      }
    });

    return unsubscribe;
  }, [nostrUser]);

  // Migrate legacy user by linking Nostr pubkey
  const migrateLegacyUserMutation = useMutation({
    mutationFn: async ({ nostrPubkey, signature, challenge }: {
      nostrPubkey: string;
      signature: string;
      challenge: string;
    }) => {
      if (!migrationState.legacyFirebaseToken) {
        throw new Error("No legacy Firebase token available");
      }

      const response = await fetch(`${CATALOG_API_BASE_URL}/auth/migrate-legacy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${migrationState.legacyFirebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey,
          signature,
          challenge,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Migration failed' }));
        throw new Error(error.error || 'Failed to migrate legacy user');
      }

      const result = await response.json();
      
      // Update state to reflect successful migration
      setMigrationState(prev => ({
        ...prev,
        needsMigration: false,
        error: null,
      }));

      return result;
    },
    onError: (error) => {
      setMigrationState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Migration failed',
      }));
    },
  });

  return {
    // State
    isLegacyUser: migrationState.isLegacyUser,
    needsMigration: migrationState.needsMigration,
    isLoading: migrationState.isLoading,
    error: migrationState.error,
    legacyFirebaseToken: migrationState.legacyFirebaseToken,

    // Actions
    migrateLegacyUser: migrateLegacyUserMutation.mutateAsync,
    
    // Loading states
    isMigrating: migrateLegacyUserMutation.isPending,
  };
}