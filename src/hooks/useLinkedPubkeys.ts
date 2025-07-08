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
        // TODO: Backend implementation needed for production
        // This endpoint requires backend implementation to:
        // 1. Validate Firebase auth token
        // 2. Query database for pubkeys linked to the email
        // 3. Return array of linked pubkeys with security controls
        // API endpoint: POST /auth/get-linked-pubkeys
        // Request body: { email: string }
        // Response: { success: boolean, pubkeys: string[], error?: string }
        // Headers: Authorization: Bearer <firebase-token>
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // TODO: Add Firebase auth token for security
            // This requires implementing getAuth().currentUser?.getIdToken()
            // Authorization: `Bearer ${firebaseToken}`
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
              // TODO: Implement proper profile fetching
              // This requires refactoring to avoid React Hook rules violation
              // Options:
              // 1. Fetch profiles in the component using separate useAuthor calls
              // 2. Create a server-side profile resolution endpoint
              // 3. Use a different pattern that doesn't violate hook rules
              return { 
                pubkey, 
                profile: null // Profile data will be fetched by components as needed
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

/**
 * Note: Profile fetching was separated to avoid React Hook rules violation
 * Components that need profile data should use useAuthor hooks separately
 * 
 * TODO: Consider implementing one of these patterns for integrated profile fetching:
 * 1. Server-side profile resolution in the backend endpoint
 * 2. Separate useLinkedPubkeysWithProfiles hook that takes an array of pubkeys
 * 3. Composite hook pattern that manages multiple useAuthor calls safely
 * 
 * Current approach keeps this hook simple and follows React Hook rules
 */