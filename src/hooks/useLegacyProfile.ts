import { useQuery } from "@tanstack/react-query";
import type { FirebaseUser } from "@/types/auth";

/**
 * Legacy profile data interface for Nostr kind 0 event population
 * Maps Wavlake legacy profile fields to Nostr profile metadata standards
 */
export interface LegacyProfile {
  /** User's display name (from displayName or derived from email) - required, non-empty string */
  readonly name: string;
  /** User's bio/about text (from bio field or empty string) */
  readonly about: string;
  /** URL to user's profile picture (from profileImageUrl or empty string) */
  readonly picture: string;
  /** User's website URL (from website field or empty string) */
  readonly website: string;
  /** NIP-05 identifier using user's email for verification - required, non-empty string */
  readonly nip05: string;
}

/**
 * Get API base URL with validation and security enforcement
 * Reuses the same pattern as other hooks in the codebase
 */
const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_NEW_API_URL;
  if (!configuredUrl) {
    console.error("VITE_NEW_API_URL environment variable is not configured");
    throw new Error("API URL not configured");
  }
  
  // Enforce HTTPS for security in production
  if (import.meta.env.PROD && !configuredUrl.startsWith('https://')) {
    console.error("API URL must use HTTPS protocol for security in production", { url: configuredUrl });
    throw new Error("API URL must use HTTPS protocol");
  }
  
  return configuredUrl;
};

/**
 * Hook to fetch legacy Wavlake profile data for authenticated Firebase users
 * 
 * This hook enables seamless profile migration by fetching existing Wavlake
 * profile data and formatting it for use in Nostr kind 0 events. It provides
 * continuity for legacy users creating new Nostr accounts.
 * 
 * Features:
 * - Secure authentication using Firebase ID tokens
 * - Comprehensive error handling without breaking auth flows
 * - Intelligent caching strategy (10-minute stale time)
 * - Graceful handling of users without legacy profile data
 * - Type-safe profile data formatting for Nostr integration
 * 
 * @example
 * ```tsx
 * const { data: legacyProfile, isLoading, error } = useLegacyProfile(firebaseUser);
 * 
 * if (isLoading) return <div>Loading profile...</div>;
 * 
 * if (legacyProfile) {
 *   // Use profile data to populate new Nostr account
 *   const newAccount = await generateNostrAccountWithProfile(legacyProfile);
 * }
 * ```
 * 
 * @param firebaseUser - Firebase user object with getIdToken method
 * @returns React Query result with legacy profile data or null
 */
export function useLegacyProfile(firebaseUser?: FirebaseUser | null) {
  return useQuery({
    queryKey: ['legacy-profile', firebaseUser?.uid, firebaseUser?.email],
    queryFn: async (): Promise<LegacyProfile | null> => {
      if (!firebaseUser) return null;
      
      // Validate Firebase user has required properties
      if (!firebaseUser.uid || !firebaseUser.getIdToken) {
        throw new Error('Invalid Firebase user: missing required properties');
      }
      
      try {
        const API_BASE_URL = getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/auth/legacy-profile`, {
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
          } else if (status === 403) {
            throw new Error('Access denied. Please check your permissions.');
          } else if (status === 404) {
            // User has no legacy profile data - this is not an error
            return null;
          } else if (status >= 500) {
            throw new Error('Server error. Please try again later.');
          }
          
          throw new Error(`Failed to fetch legacy profile (status: ${status})`);
        }
        
        const data = await response.json();
        
        // Validate response data structure
        if (typeof data !== 'object' || data === null) {
          throw new Error('Invalid response format: expected object');
        }
        
        // Handle case where API returns success but no profile data
        if (!data.success) {
          if (data.error) {
            throw new Error(`API error: ${data.error}`);
          }
          return null;
        }
        
        // Extract and format profile data for Nostr compatibility
        const baseName = data.displayName || data.email?.split('@')[0] || '';
        const finalName = baseName.trim() || firebaseUser.email?.split('@')[0] || 'Anonymous';
        const finalNip05 = data.email || '';
        
        const profile: LegacyProfile = {
          name: finalName,
          about: data.bio || '',
          picture: data.profileImageUrl || '',
          website: data.website || '',
          nip05: finalNip05
        };
        
        // Validate required fields are not empty
        if (!profile.name.trim() || !profile.nip05.trim()) {
          throw new Error('Invalid profile data: missing required fields');
        }
        
        return profile;
      } catch (error) {
        console.warn('Failed to fetch legacy profile', { 
          userId: firebaseUser?.uid,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          hasAuth: !!firebaseUser
        });
        
        // Re-throw to let React Query handle retry logic
        // Authentication errors will be handled by the retry function
        throw error;
      }
    },
    enabled: !!firebaseUser,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: (failureCount, error) => {
      // Don't retry authentication/authorization errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('401') || message.includes('403') || 
            message.includes('authentication') || message.includes('access denied')) {
          return false;
        }
      }
      
      // Retry network/server errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s...
      return Math.min(1000 * Math.pow(2, attemptIndex), 5000);
    },
  });
}

/**
 * Utility hook that provides a more semantic interface for components
 * that need to check if legacy profile data is available
 * 
 * @example
 * ```tsx
 * const { hasLegacyProfile, legacyProfile, isLoading } = useLegacyProfileStatus(firebaseUser);
 * 
 * if (hasLegacyProfile && legacyProfile) {
 *   return <div>Welcome back, {legacyProfile.name}!</div>;
 * }
 * ```
 * 
 * @param firebaseUser - Firebase user to check legacy profile for
 * @returns Object with legacy profile status and data
 */
export function useLegacyProfileStatus(firebaseUser?: FirebaseUser | null) {
  const { data: legacyProfile, isLoading, error } = useLegacyProfile(firebaseUser);
  
  return {
    /** Whether the user has legacy profile data available */
    hasLegacyProfile: !!legacyProfile,
    /** The legacy profile data (null if not available) */
    legacyProfile,
    /** Whether profile data is currently being fetched */
    isLoading,
    /** Any error that occurred during fetching */
    error,
    /** Whether legacy profile data exists and has meaningful content */
    hasRichProfile: Boolean(legacyProfile?.about || legacyProfile?.picture || legacyProfile?.website)
  };
}