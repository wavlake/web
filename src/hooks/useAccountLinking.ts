import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createNip98AuthHeader } from "@/lib/nip98Auth";
import { getAuth } from "firebase/auth";

// Base API URL for the new API
const API_BASE_URL =
  import.meta.env.VITE_NEW_API_URL || "http://localhost:8082/v1";

/**
 * Hook to link the current user's Nostr pubkey to a Firebase account
 */
export function useLinkFirebaseAccount() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      if (!user?.signer) {
        throw new Error("Must be logged in with Nostr to link account");
      }

      // Get Firebase auth token
      const auth = getAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("Must be logged in with Firebase to link account");
      }

      const firebaseToken = await firebaseUser.getIdToken();

      const url = `${API_BASE_URL}/auth/link-pubkey`;
      const method = "POST";
      const body = { pubkey: user.pubkey };

      // Create NIP-98 auth header
      const nip98AuthHeader = await createNip98AuthHeader(
        url,
        method,
        body,
        user.signer
      );

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: nip98AuthHeader,
          "X-Firebase-Token": firebaseToken,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to link account: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate account linking status to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["account-linking-status"] });
      
      // Invalidate linked pubkeys cache to refresh linked accounts data
      const firebaseUser = getAuth().currentUser;
      if (firebaseUser) {
        queryClient.invalidateQueries({ 
          queryKey: ["linked-pubkeys", firebaseUser.uid] 
        });
      }
      
      // Emit event for other components to react to account linking
      window.dispatchEvent(new CustomEvent('account-linked', { 
        detail: { 
          pubkey: user?.pubkey,
          firebaseUid: firebaseUser?.uid,
          success: true 
        } 
      }));
    },
  });
}

/**
 * Hook to unlink the current user's Nostr pubkey from their Firebase account
 */
export function useUnlinkFirebaseAccount() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      if (!user?.signer) {
        throw new Error("Must be logged in with Nostr to unlink account");
      }

      // Get Firebase auth token (required for unlink operation)
      const auth = getAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("Must be logged in with Firebase to unlink account");
      }

      const firebaseToken = await firebaseUser.getIdToken();

      const url = `${API_BASE_URL}/auth/unlink-pubkey`;
      const method = "POST";
      const body = { pubkey: user.pubkey };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to unlink account: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate account linking status to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["account-linking-status"] });
      
      // Invalidate linked pubkeys cache to refresh linked accounts data
      const firebaseUser = getAuth().currentUser;
      if (firebaseUser) {
        queryClient.invalidateQueries({ 
          queryKey: ["linked-pubkeys", firebaseUser.uid] 
        });
      }
      
      // Emit event for other components to react to account unlinking
      window.dispatchEvent(new CustomEvent('account-unlinked', { 
        detail: { 
          pubkey: user?.pubkey,
          firebaseUid: firebaseUser?.uid,
          success: true 
        } 
      }));
    },
  });
}
