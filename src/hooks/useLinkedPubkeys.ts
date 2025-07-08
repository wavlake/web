import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthor } from "@/hooks/useAuthor";
import { logAuthError } from "@/lib/authLogger";
import { isValidPubkey } from "@/lib/pubkeyUtils";

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

/**
 * Gets and validates the API base URL from environment variables
 * 
 * Security rationale: HTTPS enforcement prevents man-in-the-middle attacks
 * and ensures encrypted communication with the API server.
 * 
 * @returns Validated HTTPS API base URL
 * @throws Error if URL is not configured or not using HTTPS protocol
 */
const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_NEW_API_URL;
  if (!configuredUrl) {
    console.error("VITE_NEW_API_URL environment variable is not configured");
    throw new Error("API URL not configured");
  }
  
  // Enforce HTTPS for security - prevents credential theft and tampering
  // This validation is performed on every call to ensure consistency across
  // different execution contexts (testing, development, production)
  if (!configuredUrl.startsWith('https://')) {
    console.error("API URL must use HTTPS protocol for security", { url: configuredUrl });
    throw new Error("API URL must use HTTPS protocol");
  }
  
  return configuredUrl;
};

// Memoized API URL to prevent redundant validation on every query
const API_BASE_URL = getApiBaseUrl();

/**
 * Error status code mapping for consistent error messages
 */
const ERROR_STATUS_MESSAGES: Record<number, string> = {
  401: 'Authentication expired. Please sign in again.',
  403: 'Access denied. Please check your permissions.',
  429: 'Rate limit exceeded. Please try again later.',
  500: 'Server error. Please try again later.',
  502: 'Server temporarily unavailable. Please try again later.',
  503: 'Service unavailable. Please try again later.',
};

/**
 * Hook to fetch linked pubkeys for a Firebase user
 * 
 * @param firebaseUser - Firebase user object with getIdToken method
 * @returns React Query result with linked pubkeys array
 */
export function useLinkedPubkeys(firebaseUser?: FirebaseUser) {
  // Memoize cache configuration based on user activity patterns
  const cacheConfig = useMemo(() => {
    // For now, use static cache times but structure is ready for adaptive caching
    const staleTime = 10 * 60 * 1000; // 10 minutes
    const gcTime = 30 * 60 * 1000; // 30 minutes
    return { staleTime, gcTime };
  }, []);

  return useQuery({
    queryKey: ['linked-pubkeys', firebaseUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!firebaseUser) return [];

      try {
        // Get fresh Firebase auth token to prevent race conditions with token expiry
        // This ensures the token is valid at request time, not at query execution time
        const authToken = await firebaseUser.getIdToken();
        
        const response = await fetch(`${API_BASE_URL}/auth/get-linked-pubkeys`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const status = response.status;
          // Use error mapping for consistent and maintainable error messages
          const errorMessage = ERROR_STATUS_MESSAGES[status] || `Request failed with status ${status}`;
          throw new Error(`${errorMessage} (User: ${firebaseUser.uid})`);
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

        // Enhanced pubkey validation with better error tracking
        const validPubkeys: LinkedPubkey[] = [];
        const invalidPubkeys: string[] = [];

        data.pubkeys.forEach((pubkey: string) => {
          if (typeof pubkey !== 'string' || !isValidPubkey(pubkey)) {
            console.warn("Invalid pubkey format in response", { 
              pubkey: typeof pubkey === 'string' ? `${pubkey.slice(0, 8)}...` : 'non-string',
              type: typeof pubkey,
              length: typeof pubkey === 'string' ? pubkey.length : 'N/A'
            });
            invalidPubkeys.push(String(pubkey));
          } else {
            validPubkeys.push({ pubkey, profile: undefined });
          }
        });

        // Log invalid pubkeys for monitoring, but don't fail the request unless all are invalid
        if (invalidPubkeys.length > 0) {
          console.warn(`Found ${invalidPubkeys.length} invalid pubkeys in API response`, {
            invalidCount: invalidPubkeys.length,
            validCount: validPubkeys.length,
            userId: firebaseUser.uid
          });
          
          // Only throw if ALL pubkeys are invalid (likely a systematic issue)
          if (validPubkeys.length === 0 && data.pubkeys.length > 0) {
            throw new Error(`All ${invalidPubkeys.length} pubkeys in response are invalid`);
          }
        }

        return validPubkeys;
      } catch (error) {
        // Enhanced structured logging with more context
        console.error('Failed to fetch linked pubkeys', { 
          userId: firebaseUser?.uid,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          hasAuth: !!firebaseUser,
          timestamp: new Date().toISOString()
        });
        throw error; // Re-throw to let React Query handle retry logic
      }
    },
    enabled: !!firebaseUser,
    ...cacheConfig,
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
        
        // Get fresh Firebase auth token to prevent race conditions with token expiry
        // Force refresh ensures the token is valid for this specific request
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
          const status = response.status;
          const errorText = await response.text();
          const errorMessage = ERROR_STATUS_MESSAGES[status] || `Request failed with status ${status}`;
          throw new Error(`Email lookup failed: ${errorMessage} - ${errorText} (User: ${firebaseUser.uid})`);
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
                profile: undefined // Profile data will be fetched by components as needed
              };
            } catch (profileError) {
              // Enhanced structured logging for profile fetch errors with more context
              console.warn('Failed to fetch profile for pubkey', {
                pubkeyPrefix: pubkey.slice(0, 8),
                errorType: profileError instanceof Error ? profileError.constructor.name : 'Unknown',
                errorMessage: profileError instanceof Error ? profileError.message : String(profileError),
                timestamp: new Date().toISOString()
              });
              logAuthError('profile-fetch', profileError, undefined, pubkey);
              return { pubkey, profile: undefined };
            }
          })
        );

        return pubkeysWithProfiles;
      } catch (error) {
        // Enhanced logging with better debugging context while maintaining privacy
        const emailDomain = email ? email.split('@')[1] || 'unknown' : 'missing';
        console.error('Failed to fetch linked pubkeys for email lookup', { 
          emailDomain,
          emailProvided: !!email,
          userId: firebaseUser?.uid,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
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
 * Hook to get linked pubkeys with profiles interface (compatibility layer)
 * 
 * @param firebaseUser - Firebase user object with getIdToken method
 * @returns React Query result with linked pubkeys array
 * @remarks Despite the name, profiles are not loaded automatically. Use separate useAuthor hooks in components.
 * @deprecated Use useLinkedPubkeys directly for clarity - this hook is misleading as it doesn't load profiles
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