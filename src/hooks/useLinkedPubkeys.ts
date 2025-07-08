import { useQuery } from "@tanstack/react-query";
import type { LinkedPubkey, FirebaseUser } from "@/types/auth";

const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_NEW_API_URL;
  if (!configuredUrl) {
    throw new Error("API URL not configured");
  }
  return configuredUrl;
};

export function useLinkedPubkeys(firebaseUser?: FirebaseUser) {
  return useQuery({
    queryKey: ['linked-pubkeys', firebaseUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!firebaseUser) return [];

      try {
        const API_BASE_URL = getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 401) {
            throw new Error('Authentication expired. Please sign in again.');
          }
          if (status === 403) {
            throw new Error('Access denied. Please check your permissions.');
          }
          if (status >= 500) {
            throw new Error('Server error. Please try again later.');
          }
          throw new Error(`Request failed with status ${status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.pubkeys) {
          return [];
        }

        return data.pubkeys.map((pubkey: string) => ({
          pubkey,
          profile: null
        }));
      } catch (error) {
        console.warn('Failed to fetch linked pubkeys');
        throw error; // Re-throw to let React Query handle retry logic
      }
    },
    enabled: !!firebaseUser,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Hook to get linked pubkeys with their profiles loaded
export function useLinkedPubkeysWithProfiles(firebaseUser?: FirebaseUser) {
  const { data: linkedPubkeys = [], ...query } = useLinkedPubkeys(firebaseUser);
  
  // Return basic pubkeys without profile loading to avoid hook rules violations
  // Profile loading should be implemented in the consuming component if needed
  return {
    ...query,
    data: linkedPubkeys
  };
}