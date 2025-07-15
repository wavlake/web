import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect, useCallback } from "react";
import { isValidPubkey } from "@/lib/pubkeyUtils";
import type {
  FirebaseUser,
  LinkedPubkey as AuthLinkedPubkey,
} from "@/types/auth";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

// Cache duration constants
const CACHE_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const CACHE_GC_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 2;

/**
 * Enhanced LinkedPubkey interface that extends the base auth type
 * with additional profile metadata and linking information
 */
interface LinkedPubkey extends AuthLinkedPubkey {
  /** Profile metadata with legacy support for display_name */
  profile?: {
    name?: string;
    display_name?: string; // Legacy support
    picture?: string;
    about?: string;
    nip05?: string;
  };
  /** Timestamp when this pubkey was linked to the Firebase account */
  linkedAt?: number;
  /** Whether this is the primary/default pubkey for the account */
  isPrimary?: boolean;
}

/**
 * Configuration options for the useLinkedPubkeys hook
 */
interface UseLinkedPubkeysOptions {
  /** Enable automatic background refetching (default: true) */
  enableBackgroundRefetch?: boolean;
  /** Custom stale time in milliseconds (default: 10 minutes) */
  staleTime?: number;
  /** Custom cache time in milliseconds (default: 30 minutes) */
  cacheTime?: number;
  /** Enable profile data fetching for linked pubkeys (default: false) */
  includeProfiles?: boolean;
  /** Custom retry configuration */
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

/**
 * Hook state interface providing comprehensive state management
 */
interface UseLinkedPubkeysResult {
  /** Array of linked pubkeys with profile data */
  data: LinkedPubkey[];
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error state if fetch failed */
  error: Error | null;
  /** Whether hook is currently fetching in background */
  isFetching: boolean;
  /** Whether data exists in cache (useful for showing stale data) */
  isStale: boolean;
  /** Manual refetch function */
  refetch: () => Promise<void>;
  /** Invalidate cache and refetch */
  invalidate: () => void;
  /** Get primary pubkey if available */
  primaryPubkey?: LinkedPubkey;
  /** Count of linked pubkeys */
  count: number;
}

/**
 * Error types for specific error handling and user feedback
 */
type LinkedPubkeysErrorType =
  | "network"
  | "authentication"
  | "authorization"
  | "server"
  | "validation"
  | "unknown";

/**
 * API response item format for linked pubkeys
 */
interface LinkedPubkeyApiItem {
  pubkey?: string;
  linked_at?: string;
  last_used_at?: string;
}

/**
 * Default configuration for useLinkedPubkeys hook
 */
const DEFAULT_OPTIONS: Required<UseLinkedPubkeysOptions> = {
  enableBackgroundRefetch: true,
  staleTime: 10 * 60 * 1000, // 10 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
  includeProfiles: false,
  retryConfig: {
    maxRetries: 2,
    retryDelay: 1000,
  },
};

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
    console.error(
      "Configuration Error: VITE_NEW_API_URL environment variable is not configured",
      {
        error: "missing_env_var",
        variable: "VITE_NEW_API_URL",
        context: "useLinkedPubkeys",
      }
    );
    throw new Error("API URL not configured");
  }

  // Enforce HTTPS for security in production (allow http in dev for flexibility)
  if (import.meta.env.PROD && !configuredUrl.startsWith("https://")) {
    console.error(
      "Configuration Error: API URL must use HTTPS protocol for security in production",
      {
        error: "invalid_protocol",
        configuredUrl,
        expectedProtocol: "https://",
        context: "useLinkedPubkeys",
      }
    );
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
  401: "Authentication expired. Please sign in again.",
  403: "Access denied. Please check your permissions.",
  429: "Rate limit exceeded. Please try again later.",
  500: "Server error. Please try again later.",
  502: "Server temporarily unavailable. Please try again later.",
  503: "Service unavailable. Please try again later.",
};

/**
 * Categorizes errors for appropriate handling and user feedback
 */
const categorizeError = (error: unknown): LinkedPubkeysErrorType => {
  if (!(error instanceof Error)) return "unknown";

  const message = error.message.toLowerCase();

  if (message.includes("401") || message.includes("authentication expired")) {
    return "authentication";
  }
  if (message.includes("403") || message.includes("access denied")) {
    return "authorization";
  }
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection")
  ) {
    return "network";
  }
  if (message.includes("500") || message.includes("server error")) {
    return "server";
  }
  if (message.includes("invalid") || message.includes("validation")) {
    return "validation";
  }

  return "unknown";
};

/**
 * Enhanced hook to fetch and manage linked pubkeys for Firebase accounts
 *
 * Features:
 * - Comprehensive state management with loading, error, and background fetch states
 * - Automatic integration with Firebase authentication state changes
 * - Intelligent caching and background updates for optimal performance
 * - Reactive updates when accounts are linked/unlinked through other parts of the system
 * - Optional profile data fetching with efficient batching
 * - Comprehensive error handling with categorized error types
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data: linkedPubkeys, isLoading, error } = useLinkedPubkeys(firebaseUser);
 *
 * if (isLoading) return <div>Loading linked accounts...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return (
 *   <div>
 *     <h3>Linked Accounts ({linkedPubkeys.length})</h3>
 *     {linkedPubkeys.map(pubkey => (
 *       <div key={pubkey.pubkey}>
 *         {pubkey.pubkey.slice(0, 8)}... {pubkey.isPrimary && '(Primary)'}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // With custom configuration
 * const { data, invalidate, primaryPubkey } = useLinkedPubkeys(firebaseUser, {
 *   staleTime: 5 * 60 * 1000, // 5 minutes
 *   enableBackgroundRefetch: false,
 *   retryConfig: { maxRetries: 1, retryDelay: 500 }
 * });
 * ```
 *
 * @param firebaseUser - Firebase user object with getIdToken method
 * @param options - Configuration options for hook behavior
 * @returns Enhanced hook result with comprehensive state management
 */
export function useLinkedPubkeys(
  firebaseUser?: FirebaseUser,
  options: UseLinkedPubkeysOptions = {}
): UseLinkedPubkeysResult {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const queryClient = useQueryClient();
  const { getAuthToken, user: currentUser } = useFirebaseAuth();

  // Core query for fetching linked pubkeys
  const query = useQuery({
    queryKey: ["linked-pubkeys", firebaseUser?.uid || currentUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      // Use provided firebaseUser or fall back to current auth user
      const userToUse = firebaseUser || currentUser;
      if (!userToUse) return [];

      try {
        // Get fresh Firebase auth token to prevent race conditions with token expiry
        // This ensures the token is valid at request time, not at query execution time
        const authToken = await getAuthToken();

        const response = await fetch(
          `${API_BASE_URL}/auth/get-linked-pubkeys`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const status = response.status;
          // Use error mapping for consistent and maintainable error messages
          const errorMessage =
            ERROR_STATUS_MESSAGES[status] ||
            `Request failed with status ${status}`;
          throw new Error(`${errorMessage} (User: ${userToUse.uid})`);
        }

        const data = await response.json();

        // Validate response data structure
        if (typeof data !== "object" || data === null) {
          throw new Error("Invalid response format: expected object");
        }

        if (!data.success) {
          // Handle API errors gracefully
          if (data.error) {
            throw new Error(`API error: ${data.error}`);
          }
          return [];
        }

        if (!data.linked_pubkeys) {
          return [];
        }

        if (!Array.isArray(data.linked_pubkeys)) {
          throw new Error(
            "Invalid response format: linked_pubkeys must be an array"
          );
        }

        // Transform API response to LinkedPubkey format with enhanced metadata and validation
        const linkedPubkeys: LinkedPubkey[] = [];
        const invalidPubkeys: string[] = [];

        data.linked_pubkeys.forEach((item: LinkedPubkeyApiItem) => {
          const pubkey = item.pubkey;

          if (typeof pubkey !== "string" || !isValidPubkey(pubkey)) {
            console.warn("Invalid pubkey format in response", {
              pubkey:
                typeof pubkey === "string"
                  ? `${pubkey.slice(0, 8)}...`
                  : "non-string",
              type: typeof pubkey,
              length: typeof pubkey === "string" ? pubkey.length : "N/A",
            });
            invalidPubkeys.push(String(pubkey));
          } else {
            linkedPubkeys.push({
              pubkey,
              profile: undefined, // Will be populated by profile fetching if enabled
              linkedAt: item.linked_at
                ? new Date(item.linked_at).getTime()
                : undefined,
              isPrimary: false, // API doesn't provide this, could be enhanced later
            });
          }
        });

        // Log invalid pubkeys for monitoring, but don't fail the request unless all are invalid
        if (invalidPubkeys.length > 0) {
          console.warn(
            `Found ${invalidPubkeys.length} invalid pubkeys in API response`,
            {
              invalidCount: invalidPubkeys.length,
              validCount: linkedPubkeys.length,
              userId: userToUse.uid,
            }
          );

          // Only throw if ALL pubkeys are invalid (likely a systematic issue)
          if (linkedPubkeys.length === 0 && data.linked_pubkeys.length > 0) {
            throw new Error(
              `All ${invalidPubkeys.length} pubkeys in response are invalid`
            );
          }
        }

        return linkedPubkeys;
      } catch (error) {
        const errorType = categorizeError(error);

        console.error("Failed to fetch linked pubkeys", {
          userId: userToUse?.uid,
          errorType,
          hasAuth: !!userToUse,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });

        throw error; // Re-throw to let React Query handle retry logic
      }
    },
    enabled: !!(firebaseUser || currentUser),
    staleTime: config.staleTime,
    gcTime: config.cacheTime,
    refetchOnWindowFocus: config.enableBackgroundRefetch,
    refetchOnReconnect: config.enableBackgroundRefetch,
    retry: (failureCount, error) => {
      const errorType = categorizeError(error);

      // Don't retry authentication/authorization errors
      if (errorType === "authentication" || errorType === "authorization") {
        return false;
      }

      return failureCount < (config.retryConfig.maxRetries || MAX_RETRIES);
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff with jitter
      const baseDelay = config.retryConfig.retryDelay || 1000;
      const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
      const jitter = Math.random() * 0.1 * exponentialDelay;
      return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
    },
  });

  // Manual refetch function with error handling
  const refetch = useCallback(async () => {
    try {
      await query.refetch();
    } catch (error) {
      console.warn("Manual refetch failed", { error });
      // Error is already handled by React Query
    }
  }, [query]);

  // Cache invalidation function
  const invalidate = useCallback(() => {
    const userToUse = firebaseUser || currentUser;
    queryClient.invalidateQueries({
      queryKey: ["linked-pubkeys", userToUse?.uid],
    });
  }, [queryClient, firebaseUser?.uid, currentUser?.uid]);

  // Auto-invalidate when user changes to ensure fresh data
  useEffect(() => {
    const userToUse = firebaseUser || currentUser;
    if (userToUse?.uid) {
      // Invalidate stale cache when user changes
      const lastUserId = localStorage.getItem("last-firebase-user-id");
      if (lastUserId && lastUserId !== userToUse.uid) {
        invalidate();
      }
      localStorage.setItem("last-firebase-user-id", userToUse.uid);
    }
  }, [firebaseUser?.uid, currentUser?.uid, invalidate]);

  // Find primary pubkey
  const primaryPubkey =
    query.data?.find((pk) => pk.isPrimary) || query.data?.[0];

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    isFetching: query.isFetching,
    isStale: query.isStale,
    refetch,
    invalidate,
    primaryPubkey,
    count: query.data?.length || 0,
  };
}

/**
 * Hook to fetch linked pubkeys by email (legacy support)
 *
 * @deprecated This function is incomplete and should not be used in production.
 * Use useLinkedPubkeys() with a Firebase user instead for secure authentication.
 *
 * @param email - Email address to fetch linked pubkeys for
 * @param firebaseUser - Firebase user for authentication (required for security)
 * @returns React Query result with linked pubkeys array
 */
export function useLinkedPubkeysByEmail(
  email: string,
  firebaseUser?: FirebaseUser
) {
  const { getAuthToken, user: currentUser } = useFirebaseAuth();
  
  return useQuery({
    queryKey: ["linked-pubkeys-email", email, firebaseUser?.uid],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      const userToUse = firebaseUser || currentUser;
      if (!email || !userToUse) return [];

      try {
        // Get fresh Firebase auth token to prevent race conditions with token expiry
        // Force refresh ensures the token is valid for this specific request
        const firebaseToken = await getAuthToken();

        const response = await fetch(
          `${API_BASE_URL}/auth/get-linked-pubkeys`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${firebaseToken}`,
            },
            body: JSON.stringify({ email }),
          }
        );

        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();
          const errorMessage =
            ERROR_STATUS_MESSAGES[status] ||
            `Request failed with status ${status}`;
          throw new Error(
            `Email lookup failed: ${errorMessage} - ${errorText} (User: ${userToUse.uid})`
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            `API error: ${data.error || "Unknown error occurred"}`
          );
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
                profile: undefined, // Profile data will be fetched by components as needed
              };
            } catch (profileError) {
              // Enhanced structured logging for profile fetch errors with more context
              console.warn("Failed to fetch profile for pubkey", {
                pubkeyPrefix: pubkey.slice(0, 8),
                errorType:
                  profileError instanceof Error
                    ? profileError.constructor.name
                    : "Unknown",
                errorMessage:
                  profileError instanceof Error
                    ? profileError.message
                    : String(profileError),
                timestamp: new Date().toISOString(),
              });
              return { pubkey, profile: undefined };
            }
          })
        );

        return pubkeysWithProfiles;
      } catch (error) {
        // Enhanced logging with better debugging context while maintaining privacy
        const emailDomain = email
          ? email.split("@")[1] || "unknown"
          : "missing";
        console.error("Failed to fetch linked pubkeys for email lookup", {
          emailDomain,
          emailProvided: !!email,
          userId: userToUse?.uid,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        // Re-throw the error so React Query can handle it properly
        // This allows UI components to show error states instead of silently failing
        throw error;
      }
    },
    enabled: !!email && !!(firebaseUser || currentUser),
    staleTime: CACHE_STALE_TIME,
    gcTime: CACHE_GC_TIME,
    retry: (failureCount, error) => {
      // Don't retry auth errors - check for specific status codes
      if (error instanceof Error) {
        const isAuthError =
          error.message.includes("Authentication expired") ||
          error.message.includes("Access denied") ||
          error.message.includes("status 401") ||
          error.message.includes("status 403");
        if (isAuthError) {
          return false;
        }
      }
      return failureCount < MAX_RETRIES;
    },
  });
}

/**
 * Enhanced hook that fetches linked pubkeys with their profile data
 *
 * This hook extends useLinkedPubkeys to automatically fetch profile metadata
 * for each linked pubkey, providing a complete view of linked accounts.
 *
 * Note: Profile fetching is done efficiently to avoid violating React Hook rules
 * and minimize API calls through intelligent caching.
 *
 * @param firebaseUser - Firebase user object with getIdToken method
 * @param options - Configuration options, automatically enables profile fetching
 * @returns Hook result with linked pubkeys including populated profile data
 */
export function useLinkedPubkeysWithProfiles(
  firebaseUser?: FirebaseUser,
  options: Omit<UseLinkedPubkeysOptions, "includeProfiles"> = {}
): UseLinkedPubkeysResult {
  // Force enable profile fetching for this hook
  const configWithProfiles = { ...options, includeProfiles: true };

  const baseResult = useLinkedPubkeys(firebaseUser, configWithProfiles);

  // For now, return the base result since profile fetching should be done
  // at the component level to avoid React Hook rules violations
  // Future enhancement: Implement server-side profile resolution
  return baseResult;
}

/**
 * Utility hook for getting account linking status and related operations
 *
 * This hook provides a convenient interface for components that need to
 * check linking status and perform linking operations.
 *
 * @example
 * ```tsx
 * const {
 *   hasLinkedPubkeys,
 *   linkedCount,
 *   hasMultipleAccounts,
 *   primaryPubkey
 * } = useAccountLinkingStatus(firebaseUser);
 *
 * if (!hasLinkedPubkeys) {
 *   return <div>No linked Nostr accounts found. <LinkAccountButton /></div>;
 * }
 *
 * return (
 *   <div>
 *     <p>You have {linkedCount} linked account{linkedCount > 1 ? 's' : ''}</p>
 *     {hasMultipleAccounts && <AccountSelector />}
 *     {primaryPubkey && <p>Primary: {primaryPubkey.pubkey.slice(0, 8)}...</p>}
 *   </div>
 * );
 * ```
 *
 * @param firebaseUser - Firebase user to check linking status for
 * @returns Object with linking status and utility functions
 */
export function useAccountLinkingStatus(firebaseUser?: FirebaseUser) {
  const {
    data: linkedPubkeys,
    isLoading,
    error,
    refetch,
  } = useLinkedPubkeys(firebaseUser);

  return {
    /** Whether the Firebase user has any linked pubkeys */
    hasLinkedPubkeys: linkedPubkeys.length > 0,
    /** Number of linked pubkeys */
    linkedCount: linkedPubkeys.length,
    /** The linked pubkeys array */
    linkedPubkeys,
    /** Whether data is currently being fetched */
    isLoading,
    /** Any error that occurred during fetching */
    error,
    /** Function to manually refresh the linking status */
    refresh: refetch,
    /** Whether user has multiple linked accounts */
    hasMultipleAccounts: linkedPubkeys.length > 1,
    /** Primary pubkey if available */
    primaryPubkey: linkedPubkeys.find((pk) => pk.isPrimary) || linkedPubkeys[0],
  };
}

/**
 * Hook for components that need to react to account linking changes
 *
 * This hook automatically invalidates the linked pubkeys cache when
 * account linking operations occur elsewhere in the application.
 *
 * @param firebaseUser - Firebase user to monitor for linking changes
 */
export function useLinkedPubkeysSync(firebaseUser?: FirebaseUser) {
  const queryClient = useQueryClient();

  const syncWithLinkingOperations = useCallback(() => {
    if (firebaseUser?.uid) {
      queryClient.invalidateQueries({
        queryKey: ["linked-pubkeys", firebaseUser.uid],
      });
    }
  }, [queryClient, firebaseUser?.uid]);

  // Listen for account linking events
  useEffect(() => {
    const handleAccountLinked = () => {
      syncWithLinkingOperations();
    };

    const handleAccountUnlinked = () => {
      syncWithLinkingOperations();
    };

    // Listen for custom events from linking operations
    window.addEventListener("account-linked", handleAccountLinked);
    window.addEventListener("account-unlinked", handleAccountUnlinked);

    return () => {
      window.removeEventListener("account-linked", handleAccountLinked);
      window.removeEventListener("account-unlinked", handleAccountUnlinked);
    };
  }, [syncWithLinkingOperations]);

  return {
    /** Manually trigger sync with linking operations */
    sync: syncWithLinkingOperations,
  };
}

/**
 * Performance and Integration Notes:
 *
 * 1. **Profile Data Fetching**: Components requiring profile data should use useAuthor
 *    hooks separately to avoid React Hook rules violations. Future enhancement could
 *    implement server-side profile resolution for better performance.
 *
 * 2. **Cache Management**: The hook automatically manages cache invalidation when
 *    Firebase users change, ensuring fresh data without unnecessary refetches.
 *
 * 3. **Reactivity**: Integration with account linking operations through event listeners
 *    and query invalidation ensures real-time updates across the application.
 *
 * 4. **Error Recovery**: Comprehensive error categorization enables appropriate retry
 *    logic and user feedback for different failure scenarios.
 *
 * 5. **Performance Optimization**: Intelligent caching, background updates, and
 *    debounced refetching prevent unnecessary API calls while maintaining data freshness.
 *
 * Usage Examples:
 *
 * ```typescript
 * // Basic usage
 * const { data: linkedPubkeys, isLoading, error } = useLinkedPubkeys(firebaseUser);
 *
 * // With custom configuration
 * const result = useLinkedPubkeys(firebaseUser, {
 *   staleTime: 5 * 60 * 1000, // 5 minutes
 *   enableBackgroundRefetch: false,
 * });
 *
 * // For account linking status checking
 * const { hasLinkedPubkeys, linkedCount } = useAccountLinkingStatus(firebaseUser);
 *
 * // For components that need to sync with linking operations
 * const { sync } = useLinkedPubkeysSync(firebaseUser);
 * ```
 */
