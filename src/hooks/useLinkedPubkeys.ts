import { useQuery } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";

interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

// Base API URL for the new API
const API_BASE_URL =
  import.meta.env.VITE_NEW_API_URL || "http://localhost:8082/v1";

export function useLinkedPubkeys(email: string) {
  return useQuery({
    queryKey: ['linked-pubkeys', email],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!email) return [];

      try {
        // Note: This would need to be implemented in the backend
        // For now, return empty array as this is foundational component
        // The actual API endpoint would be GET /auth/get-linked-pubkeys
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Would need Firebase auth token here
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch linked pubkeys');
        }

        const data = await response.json();
        
        // Transform the API response to include profile data
        const pubkeysWithProfiles: LinkedPubkey[] = await Promise.all(
          (data.pubkeys || []).map(async (pubkey: string) => {
            try {
              // Use existing useAuthor hook pattern to fetch profile
              // This would be done via React Query in the actual implementation
              return { 
                pubkey, 
                profile: null // For now - would fetch actual profile data
              };
            } catch {
              return { pubkey, profile: null };
            }
          })
        );

        return pubkeysWithProfiles;
      } catch (error) {
        console.error('Failed to fetch linked pubkeys:', error);
        // Return empty array for graceful degradation
        return [];
      }
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Note: This hook was causing React Hook rules violation
// For now, profile fetching should be done separately in components that need it
// TODO: Implement proper profile fetching pattern that follows React Hook rules