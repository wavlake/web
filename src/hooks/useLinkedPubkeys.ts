import { useQuery } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";
import { FirebaseUser } from "@/types/auth";

// Cache duration constants
const CACHE_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const CACHE_GC_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 2;

interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

/**
 * Gets the API base URL from environment variables with validation
 * @returns API base URL string
 * @throws {Error} If VITE_NEW_API_URL is not configured or doesn't use HTTPS
 */
const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_NEW_API_URL;
  if (!configuredUrl) {
    console.error("Configuration Error: VITE_NEW_API_URL environment variable is not configured", {
      error: "missing_env_var",
      variable: "VITE_NEW_API_URL",
      context: "useLinkedPubkeys"
    });
    throw new Error("API URL not configured");
  }
  
  // Enforce HTTPS for security
  if (!configuredUrl.startsWith('https://')) {
    console.error("Configuration Error: API URL must use HTTPS protocol for security", {
      error: "invalid_protocol",
      configuredUrl,
      expectedProtocol: "https://",
      context: "useLinkedPubkeys"
    });
    throw new Error("API URL must use HTTPS protocol");
  }
  
  return configuredUrl;
};

/**
 * Hook to fetch linked pubkeys for a Firebase user
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
    staleTime: CACHE_STALE_TIME,
    gcTime: CACHE_GC_TIME,
    retry: (failureCount, error) => {
      // Don't retry auth errors - check for specific status codes
      if (error instanceof Error) {
        const isAuthError = error.message.includes('Authentication expired') || 
                           error.message.includes('Access denied') ||
                           error.message.includes('status 401') ||
                           error.message.includes('status 403');
        if (isAuthError) {
          return false;
        }
      }
      return failureCount < MAX_RETRIES;
    },
  });
}

/**
 * Hook to fetch linked pubkeys by email (legacy support)
 * @param email - Email address to fetch linked pubkeys for
 * @param firebaseUser - Firebase user for authentication
 * @returns React Query result with linked pubkeys array
 */
export function useLinkedPubkeysByEmail(email: string, firebaseUser?: FirebaseUser) {
  return useQuery({
    queryKey: ['linked-pubkeys-email', email, firebaseUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!email || !firebaseUser) return [];

      try {
        const API_BASE_URL = getApiBaseUrl();
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
    enabled: !!email && !!firebaseUser,
    staleTime: CACHE_STALE_TIME,
    gcTime: CACHE_GC_TIME,
    retry: (failureCount, error) => {
      // Don't retry auth errors - check for specific status codes
      if (error instanceof Error) {
        const isAuthError = error.message.includes('Authentication expired') || 
                           error.message.includes('Access denied') ||
                           error.message.includes('status 401') ||
                           error.message.includes('status 403');
        if (isAuthError) {
          return false;
        }
      }
      return failureCount < MAX_RETRIES;
    },
  });
}

/**
 * Hook to get linked pubkeys with their profiles loaded
 * @param firebaseUser - Firebase user object with getIdToken method
 * @returns React Query result with linked pubkeys array (profiles loaded separately)
 */
export function useLinkedPubkeysWithProfiles(firebaseUser?: FirebaseUser) {
  const { data: linkedPubkeys = [], ...query } = useLinkedPubkeys(firebaseUser);
  
  // Return basic pubkeys without profile loading to avoid hook rules violations
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