import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { User as FirebaseUser } from "firebase/auth";

/**
 * Simple LinkedPubkey interface
 */
interface LinkedPubkey {
  pubkey: string;
  linkedAt?: number;
  isMostRecentlyLinked?: boolean;
}

// API URL
const API_BASE_URL =
  import.meta.env.VITE_NEW_API_URL || "http://localhost:8082/v1";

/**
 * Makes HTTP request to fetch linked pubkeys for a specific Firebase user
 */
export const makeLinkedPubkeysRequest = async (
  firebaseUser: FirebaseUser,
  authToken: string
): Promise<LinkedPubkey[]> => {
  const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const mostRecentlyLinked = data.linked_pubkeys?.[0]?.pubkey;
  return (data.linked_pubkeys || []).map((item: { pubkey: string; linked_at?: string }) => ({
    pubkey: item.pubkey,
    linkedAt: item.linked_at
      ? new Date(item.linked_at).getTime()
      : undefined,
    isMostRecentlyLinked: item.pubkey === mostRecentlyLinked,
  }));
};

/**
 * Hook to fetch linked pubkeys for the current Firebase user
 */
export function useLinkedPubkeys() {
  const { getAuthToken, user: currentUser } = useFirebaseAuth();

  return useQuery({
    queryKey: ["linked-pubkeys", currentUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!currentUser) return [];

      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("Failed to get Firebase auth token");
      }
      return await makeLinkedPubkeysRequest(currentUser, authToken);
    },
    enabled: !!currentUser,
  });
}

