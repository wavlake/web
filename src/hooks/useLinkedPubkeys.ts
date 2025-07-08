import { useQuery } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";

export interface LinkedPubkey {
  pubkey: string;
  profile?: { name?: string; picture?: string };
}

export function useLinkedPubkeys(firebaseUser?: { uid: string; getIdToken: () => Promise<string> }) {
  return useQuery({
    queryKey: ['linked-pubkeys', firebaseUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!firebaseUser) return [];

      try {
        const API_BASE_URL = import.meta.env.VITE_NEW_API_URL || "https://api-cgi4gylh7q-uc.a.run.app/v1";
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch linked pubkeys');
        }

        const data = await response.json();
        
        if (!data.success || !data.pubkeys) {
          return [];
        }

        return data.pubkeys.map((pubkey: string) => ({
          pubkey,
          profile: null // Profile will be loaded separately using useAuthor
        }));
      } catch (error) {
        console.error('Failed to fetch linked pubkeys:', error);
        return [];
      }
    },
    enabled: !!firebaseUser,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

// Hook to get linked pubkeys with their profiles loaded
export function useLinkedPubkeysWithProfiles(firebaseUser?: { uid: string; getIdToken: () => Promise<string> }) {
  const { data: linkedPubkeys = [], ...query } = useLinkedPubkeys(firebaseUser);
  
  // For now, return basic pubkeys without profile loading to avoid hook rules violations
  // Profile loading can be implemented in the consuming component if needed
  return {
    ...query,
    data: linkedPubkeys
  };
}