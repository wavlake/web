import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { createNip98AuthHeader } from "@/lib/nip98Auth";

export const useLinkAccount = () => {
  const { user: firebaseUser, getAuthToken } = useFirebaseAuth();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user || !firebaseUser) {
        throw new Error("User must be logged in to link accounts");
      }
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("Failed to get Firebase auth token");
      }

      const url = `${import.meta.env.VITE_NEW_API_URL}/auth/link-pubkey`;
      const method = "POST";
      const body = {
        pubkey: user.pubkey,
        firebaseUid: firebaseUser.uid,
      };

      // Create NIP-98 auth header
      const nip98AuthHeader = await createNip98AuthHeader(
        url,
        method,
        body,
        user.signer
      );

      // Make the API request to link the account
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: nip98AuthHeader,
          "X-Firebase-Token": authToken,
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
    onSuccess: () => {
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({
        queryKey: ["linked-pubkeys", firebaseUser?.uid],
      });
    },
    onError: (error) => {
      console.error("Failed to link account:", error);
      throw error; // Re-throw to allow component to handle it
    },
  });
};
