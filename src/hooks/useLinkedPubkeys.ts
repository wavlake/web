import { useQuery } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";
import { logAuthError } from "@/lib/authLogger";

interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

interface FirebaseUser {
  uid: string;
  email: string | null;
  getIdToken: () => Promise<string>;
}

// Cache the validated API URL to avoid redundant validation on every call
let cachedApiUrl: string | null = null;

const getApiBaseUrl = (): string => {
  // Return cached URL if already validated
  if (cachedApiUrl) {
    return cachedApiUrl;
  }
  
  const configuredUrl = import.meta.env.VITE_NEW_API_URL;
  if (!configuredUrl) {
    console.error("VITE_NEW_API_URL environment variable is not configured");
    throw new Error("API URL not configured");
  }
  
  // Enforce HTTPS for security (validate only once)
  if (!configuredUrl.startsWith('https://')) {
    console.error("API URL must use HTTPS protocol for security", { url: configuredUrl });
    throw new Error("API URL must use HTTPS protocol");
  }
  
  // Cache the validated URL for future calls
  cachedApiUrl = configuredUrl;
  return configuredUrl;
};

/**
 * Hook to fetch linked pubkeys for a Firebase user
 * 
 * @param firebaseUser - Firebase user object with getIdToken method
 * @returns React Query result with linked pubkeys array
 */
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

/**
 * Hook to fetch linked pubkeys by email (legacy support) with required authentication
 * 
 * @param email - Email address to fetch linked pubkeys for
 * @param firebaseUser - Firebase user for authentication (required for security)
 * @returns React Query result with linked pubkeys array
 */
export function useLinkedPubkeysByEmail(email: string, firebaseUser?: FirebaseUser) {
  return useQuery({
    queryKey: ['linked-pubkeys-email', email, firebaseUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!email || !firebaseUser) return [];

      try {
        const API_BASE_URL = getApiBaseUrl();
        
        // Get Firebase auth token for secure request
        const firebaseToken = await firebaseUser.getIdToken();
        
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`
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
              // Use structured logging for profile fetch errors
              logAuthError('profile-fetch', profileError, undefined, pubkey);
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
    enabled: !!email && !!firebaseUser,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to get linked pubkeys (alias for useLinkedPubkeys with consistent interface)
 * 
 * Note: Despite the historical name, this hook does NOT automatically load profiles.
 * Profile loading should be implemented in the consuming component using separate
 * useAuthor hooks to avoid React Hook rules violations.
 * 
 * @param firebaseUser - Firebase user for authentication
 * @returns React Query result with linked pubkeys array (without profiles)
 * @deprecated Use useLinkedPubkeys directly for clarity
 */
export function useLinkedPubkeysWithProfiles(firebaseUser?: FirebaseUser) {
  const { data: linkedPubkeys = [], ...query } = useLinkedPubkeys(firebaseUser);
  
  // This hook does not actually load profiles to avoid hook rules violations
  // Profile loading should be implemented in the consuming component if needed
  return {
    ...query,
    data: linkedPubkeys
  };
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