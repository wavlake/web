import { useQuery } from "@tanstack/react-query";
import type { LinkedPubkey, FirebaseUser } from "@/types/auth";

const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_NEW_API_URL;
  if (!configuredUrl) {
    console.error("VITE_NEW_API_URL environment variable is not configured");
    throw new Error("API URL not configured");
  }
  
  // Enforce HTTPS for security
  if (!configuredUrl.startsWith('https://')) {
    console.error("API URL must use HTTPS protocol for security", { url: configuredUrl });
    throw new Error("API URL must use HTTPS protocol");
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
        
        // Validate response data structure
        if (typeof data !== 'object' || data === null) {
          throw new Error('Invalid response format: expected object');
        }
        
        if (!data.success || !data.pubkeys) {
          return [];
        }
        
        if (!Array.isArray(data.pubkeys)) {
          throw new Error('Invalid response format: pubkeys must be an array');
        }

        return data.pubkeys.map((pubkey: string) => {
          if (typeof pubkey !== 'string' || pubkey.length !== 64) {
            console.warn("Invalid pubkey format in response", { pubkey });
            return null;
          }
          return {
            pubkey,
            profile: null
          };
        }).filter(Boolean) as LinkedPubkey[];
      } catch (error) {
        console.warn('Failed to fetch linked pubkeys', { 
          userId: firebaseUser?.uid,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          hasAuth: !!firebaseUser
        });
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