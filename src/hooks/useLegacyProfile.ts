import { useQuery } from "@tanstack/react-query";
import type { FirebaseUser } from "@/types/auth";

/**
 * Legacy profile data interface for Nostr kind 0 event population
 * Maps Wavlake legacy profile fields to Nostr profile metadata standards
 */
export interface LegacyProfile {
  /** User's display name (from displayName or derived from email) */
  name: string;
  /** User's bio/about text (from bio field or empty string) */
  about: string;
  /** URL to user's profile picture (from profileImageUrl or empty string) */
  picture: string;
  /** User's website URL (from website field or empty string) */
  website: string;
  /** NIP-05 identifier using user's email for verification */
  nip05: string;
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
    queryKey: ['legacy-profile', firebaseUser?.uid],
    queryFn: async (): Promise<LegacyProfile | null> => {
      if (!firebaseUser) return null;
      
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
          let errorMessage = `Failed to fetch legacy profile (status: ${status})`;
          
          if (status === 401) {
            errorMessage = 'Authentication expired. Please sign in again.';
          } else if (status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else if (status === 404) {
            // User has no legacy profile data - this is not an error
            return null;
          } else if (status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
          
          throw new Error(errorMessage);
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
        const profile: LegacyProfile = {
          name: data.displayName || data.email?.split('@')[0] || 'Anonymous',
          about: data.bio || '',
          picture: data.profileImageUrl || '',
          website: data.website || '',
          nip05: data.email || ''
        };
        
        // Validate that we have at least a name
        if (!profile.name || profile.name.trim() === '') {
          console.warn('Legacy profile missing display name, using fallback');
          profile.name = firebaseUser.email?.split('@')[0] || 'Anonymous';
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
        // This ensures authentication errors don't block the flow
        throw error;
      }
    },
    enabled: !!firebaseUser,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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
    hasRichProfile: !!(legacyProfile && (
      legacyProfile.about || 
      legacyProfile.picture || 
      legacyProfile.website
    ))
  };
}

// LegacyProfile interface is already exported above