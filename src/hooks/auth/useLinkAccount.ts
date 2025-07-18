import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../useCurrentUser";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { createNip98AuthHeader } from "@/lib/nip98Auth";

interface LinkAccountParams {
  pubkey: string;
  firebaseUid: string;
  authToken: string;
  signer: {
    signEvent: (event: unknown) => Promise<unknown>;
    getPublicKey?: () => Promise<string>;
  };
}

/**
 * Makes HTTP request to link Firebase and Nostr accounts
 */
export const makeLinkAccountRequest = async ({
  pubkey,
  firebaseUid,
  authToken,
  signer,
}: LinkAccountParams) => {
  const url = `${import.meta.env.VITE_NEW_API_URL}/auth/link-pubkey`;
  const method = "POST";
  const body = {
    pubkey,
    firebaseUid,
  };

  // Create NIP-98 auth header
  const nip98AuthHeader = await createNip98AuthHeader(
    url,
    method,
    body,
    signer as any
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
};

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

      return await makeLinkAccountRequest({
        pubkey: user.pubkey,
        firebaseUid: firebaseUser.uid,
        authToken,
        signer: user.signer,
      });
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
