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
        // TODO: Backend implementation needed
        // API endpoint: POST /auth/get-linked-pubkeys
        // Request body: { email: string }
        // Response: { success: boolean, pubkeys: string[], error?: string }
        // Headers: Authorization: Bearer <firebase-token>
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add Firebase auth token: Authorization: `Bearer ${firebaseToken}`
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch linked pubkeys: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(`API error: ${data.error || 'Unknown error occurred'}`);
        }

        // Transform the API response to include profile data
        const pubkeysWithProfiles: LinkedPubkey[] = await Promise.all(
          (data.pubkeys || []).map(async (pubkey: string) => {
            try {
              // TODO: Use actual profile fetching here
              // Currently returns null profile to avoid React Hook rules violation
              return { 
                pubkey, 
                profile: null // Profile fetching needs proper implementation
              };
            } catch (profileError) {
              console.warn(`Failed to fetch profile for pubkey ${pubkey.slice(0, 8)}...`, profileError);
              return { pubkey, profile: null };
            }
          })
        );

        return pubkeysWithProfiles;
      } catch (error) {
        console.error('Failed to fetch linked pubkeys for email:', email ? 'provided' : 'missing', error);
        // Re-throw the error so React Query can handle it properly
        // This allows UI components to show error states instead of silently failing
        throw error;
      }
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Note: This hook was causing React Hook rules violation
// For now, profile fetching should be done separately in components that need it
// TODO: Implement proper profile fetching pattern that follows React Hook rules