import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import type { NostrEvent } from "@nostrify/nostrify";

import { useCurrentUser } from "./useCurrentUser";
import {
  initializeFirebasePublishing,
  isPublishingConfigured,
  isPublishingEnabled,
  setPublishingEnabled,
  getFirebaseTokenForNostr,
  linkEmailForRecovery,
  signOutPublishing,
} from "@/lib/firebasePublishing";

interface PublishingAuthState {
  isEnabled: boolean;
  isConfigured: boolean;
  firebaseToken: string | null;
  linkedEmail: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing publishing authentication
 * This is separate from main auth to keep Nostr as primary
 */
export function usePublishingAuth() {
  const { user: nostrUser } = useCurrentUser();
  const [authState, setAuthState] = useState<PublishingAuthState>({
    isEnabled: false,
    isConfigured: false,
    firebaseToken: null,
    linkedEmail: null,
    isLoading: true,
    error: null,
  });

  // Check if Firebase is configured for publishing and set up auth listener
  useEffect(() => {
    const configured = isPublishingConfigured();
    const enabled = isPublishingEnabled();

    setAuthState((prev) => ({
      ...prev,
      isConfigured: configured,
      isEnabled: enabled,
      isLoading: false,
    }));

    // Only initialize Firebase if publishing is enabled
    if (configured && enabled) {
      const { auth } = initializeFirebasePublishing();

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            setAuthState((prev) => ({
              ...prev,
              firebaseToken: token,
              linkedEmail: user.email,
              isEnabled: true,
            }));
          } catch (error) {
            console.error("Failed to get Firebase token:", error);
            setAuthState((prev) => ({
              ...prev,
              error: "Failed to refresh publishing token",
            }));
          }
        } else {
          setAuthState((prev) => ({
            ...prev,
            firebaseToken: null,
            linkedEmail: null,
          }));
        }
      });

      return unsubscribe;
    }
  }, []); // Only run on mount

  // Separate effect to listen for changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const enabled = isPublishingEnabled();
      setAuthState(prev => ({ ...prev, isEnabled: enabled }));
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case localStorage was changed in same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Query to refresh token when needed
  const { refetch: refreshToken } = useQuery({
    queryKey: ["publishing-token", authState.isEnabled],
    queryFn: async () => {
      if (!authState.isEnabled) return null;

      const { auth } = initializeFirebasePublishing();
      const user = auth.currentUser;
      if (!user) return null;

      return await user.getIdToken(true);
    },
    enabled: authState.isEnabled && !!authState.firebaseToken,
    staleTime: 1000 * 60 * 50, // Refresh before expiry
    refetchInterval: 1000 * 60 * 50,
  });

  // Enable publishing for current Nostr user
  const enablePublishingMutation = useMutation({
    mutationFn: async () => {
      if (!nostrUser) {
        throw new Error("Must be logged in with Nostr to enable publishing");
      }

      // Create a challenge for signing
      const challenge = `Enable publishing for Wavlake at ${Date.now()}`;

      // Sign the challenge with Nostr key
      const event: Partial<NostrEvent> = {
        kind: 22242, // Arbitrary kind for auth
        content: challenge,
        tags: [
          ["challenge", challenge],
          ["p", nostrUser.pubkey],
          ["t", "wavlake-publishing-auth"],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await nostrUser.signer.signEvent(event as NostrEvent);
      console.log("Signed event:", signedEvent);
      // Exchange for Firebase token
      const firebaseToken = await getFirebaseTokenForNostr(
        nostrUser.pubkey,
        JSON.stringify(signedEvent),
        challenge
      );

      // Mark publishing as enabled
      setPublishingEnabled(true);

      setAuthState((prev) => ({
        ...prev,
        isEnabled: true,
        firebaseToken,
        error: null,
      }));

      return firebaseToken;
    },
    onError: (error) => {
      setAuthState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to enable publishing",
      }));
    },
  });

  // Link email for recovery (optional)
  const linkEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!nostrUser || !authState.firebaseToken) {
        throw new Error("Must have publishing enabled to link email");
      }

      await linkEmailForRecovery(
        authState.firebaseToken,
        email,
        nostrUser.pubkey
      );

      setAuthState((prev) => ({
        ...prev,
        linkedEmail: email,
      }));
    },
    onError: (error) => {
      setAuthState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to link email",
      }));
    },
  });

  // Disable publishing
  const disablePublishing = useCallback(async () => {
    await signOutPublishing();
    setPublishingEnabled(false);

    setAuthState({
      isEnabled: false,
      isConfigured: authState.isConfigured,
      firebaseToken: null,
      linkedEmail: null,
      isLoading: false,
      error: null,
    });
  }, [authState.isConfigured]);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    canPublish: authState.isEnabled && !!authState.firebaseToken,
    isPublishingEnabled: authState.isEnabled,
    isPublishingConfigured: authState.isConfigured,
    firebaseToken: authState.firebaseToken,
    linkedEmail: authState.linkedEmail,
    isLoading: authState.isLoading,
    error: authState.error,

    // Actions
    enablePublishing: enablePublishingMutation.mutateAsync,
    linkEmail: linkEmailMutation.mutateAsync,
    disablePublishing,
    refreshToken,
    clearError,

    // Loading states
    isEnablingPublishing: enablePublishingMutation.isPending,
    isLinkingEmail: linkEmailMutation.isPending,
  };
}
