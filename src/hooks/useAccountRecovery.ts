import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

// Catalog API base URL - use proxy in development to avoid CSP issues
const CATALOG_API_BASE_URL = import.meta.env.DEV 
  ? "/api/catalog"
  : import.meta.env.VITE_CATALOG_API_URL || "http://localhost:3210/v1";

interface RecoveryStatus {
  hasEmailRecovery: boolean;
  linkedEmail?: string;
  firebaseUserId?: string;
}

interface LinkEmailRecoveryParams {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Hook for managing email recovery options for Nostr users
 */
export function useAccountRecovery() {
  const { user: nostrUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Check if user has email recovery set up
  const { data: recoveryStatus, isLoading } = useQuery({
    queryKey: ['account-recovery', nostrUser?.pubkey],
    queryFn: async (): Promise<RecoveryStatus> => {
      if (!nostrUser?.pubkey) {
        throw new Error('No Nostr user logged in');
      }

      // Check if this Nostr pubkey is linked to any Firebase account
      // We'll need to create a new endpoint for this
      const response = await fetch(`${CATALOG_API_BASE_URL}/auth/check-recovery-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey: nostrUser.pubkey,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No Firebase account linked
          return { hasEmailRecovery: false };
        }
        throw new Error('Failed to check recovery status');
      }

      const result = await response.json();
      return {
        hasEmailRecovery: result.hasEmailRecovery,
        linkedEmail: result.linkedEmail,
        firebaseUserId: result.firebaseUserId,
      };
    },
    enabled: !!nostrUser?.pubkey,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Link email recovery to Nostr account
  const linkEmailRecoveryMutation = useMutation({
    mutationFn: async ({ email, password, confirmPassword }: LinkEmailRecoveryParams) => {
      if (!nostrUser?.pubkey) {
        throw new Error('No Nostr user logged in');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await fetch(`${CATALOG_API_BASE_URL}/auth/link-firebase-to-nostr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nostrPubkey: nostrUser.pubkey,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to link email recovery' }));
        throw new Error(error.error || 'Failed to link email recovery');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Refresh the recovery status
      queryClient.invalidateQueries({ queryKey: ['account-recovery'] });
      setError(null);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Failed to link email recovery');
    },
  });

  // Remove email recovery
  const removeEmailRecoveryMutation = useMutation({
    mutationFn: async () => {
      if (!nostrUser?.pubkey) {
        throw new Error('No Nostr user logged in');
      }

      const response = await fetch(`${CATALOG_API_BASE_URL}/auth/unlink-firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey: nostrUser.pubkey,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to remove email recovery' }));
        throw new Error(error.error || 'Failed to remove email recovery');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Refresh the recovery status
      queryClient.invalidateQueries({ queryKey: ['account-recovery'] });
      setError(null);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Failed to remove email recovery');
    },
  });

  // Clear error
  const clearError = () => setError(null);

  return {
    // State
    recoveryStatus,
    isLoading,
    error,
    hasEmailRecovery: recoveryStatus?.hasEmailRecovery || false,
    linkedEmail: recoveryStatus?.linkedEmail,

    // Actions
    linkEmailRecovery: linkEmailRecoveryMutation.mutateAsync,
    removeEmailRecovery: removeEmailRecoveryMutation.mutateAsync,
    clearError,

    // Loading states
    isLinkingEmail: linkEmailRecoveryMutation.isPending,
    isRemovingEmail: removeEmailRecoveryMutation.isPending,
  };
}