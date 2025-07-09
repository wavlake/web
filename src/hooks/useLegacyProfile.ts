import { useQuery } from "@tanstack/react-query";
import type { FirebaseUser } from "@/types/auth";

/**
 * Legacy API response structure from /legacy/metadata endpoint
 */
interface LegacyApiResponse {
  user: {
    id: string;
    name: string;
    lightning_address: string;
    artwork_url: string;
    msat_balance: number;
    is_locked: boolean;
  };
  artists: Array<{
    id: string;
    name: string;
    verified: boolean;
    msat_total: number;
  }>;
  albums: Array<{
    id: string;
    title: string;
    is_single: boolean;
    is_draft: boolean;
    msat_total: number;
  }>;
  tracks: Array<{
    id: string;
    title: string;
  }>;
}

/**
 * Legacy profile data interface for Nostr kind 0 event population
 * Maps Wavlake legacy profile fields to Nostr profile metadata standards
 */
export interface LegacyProfile {
  /** User's display name (from name field) - required, non-empty string */
  readonly name: string;
  /** User's bio/about text (empty string for legacy users) */
  readonly about: string;
  /** URL to user's profile picture (from artwork_url or empty string) */
  readonly picture: string;
  /** User's website URL (empty string for legacy users) */
  readonly website: string;
  /** NIP-05 identifier using lightning_address for verification - required, non-empty string */
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
  if (import.meta.env.PROD && !configuredUrl.startsWith("https://")) {
    console.error(
      "API URL must use HTTPS protocol for security in production",
      { url: configuredUrl }
    );
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
 * - Single fetch strategy - no automatic refetching
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
    queryKey: ["legacy-profile", firebaseUser?.uid, firebaseUser?.email],
    queryFn: async (): Promise<LegacyProfile | null> => {
      if (!firebaseUser) return null;

      // Validate Firebase user has required properties
      if (!firebaseUser.uid || !firebaseUser.getIdToken) {
        throw new Error("Invalid Firebase user: missing required properties");
      }

      try {
        const API_BASE_URL = getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/legacy/metadata`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const status = response.status;

          if (status === 401) {
            throw new Error("Authentication expired. Please sign in again.");
          } else if (status === 403) {
            throw new Error("Access denied. Please check your permissions.");
          } else if (status === 404) {
            // User has no legacy profile data - this is not an error
            return null;
          } else if (status >= 500) {
            throw new Error("Server error. Please try again later.");
          }

          throw new Error(`Failed to fetch legacy profile (status: ${status})`);
        }

        const data: LegacyApiResponse = await response.json();

        // Validate response data structure
        if (typeof data !== "object" || data === null) {
          throw new Error("Invalid response format: expected object");
        }

        // Validate that user object exists
        if (!data.user || typeof data.user !== "object") {
          throw new Error("Invalid response format: missing user object");
        }

        // Extract and format profile data for Nostr compatibility
        const userData = data.user;
        const finalName =
          userData.name?.trim() ||
          firebaseUser.email?.split("@")[0] ||
          "Anonymous";
        const finalNip05 = userData.lightning_address || "";

        const profile: LegacyProfile = {
          name: finalName,
          about: "", // Legacy users don't have bio data
          picture: userData.artwork_url || "",
          website: "", // Legacy users don't have website data
          nip05: finalNip05,
        };

        // Validate required fields are not empty
        if (!profile.name.trim()) {
          throw new Error("Invalid profile data: missing required name field");
        }

        return profile;
      } catch (error) {
        console.warn("Failed to fetch legacy profile", {
          userId: firebaseUser?.uid,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          hasAuth: !!firebaseUser,
        });

        // Re-throw to let React Query handle retry logic
        // Authentication errors will be handled by the retry function
        throw error;
      }
    },
    enabled: !!firebaseUser,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}
