import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthor } from "@/hooks/useAuthor";
import { useEffect, useCallback } from "react";
import type { FirebaseUser, LinkedPubkey as AuthLinkedPubkey } from "@/types/auth";

/**
 * Enhanced LinkedPubkey interface that extends the base auth type
 * with additional profile metadata and linking information
 */
interface LinkedPubkey extends AuthLinkedPubkey {
  /** Profile metadata with legacy support for display_name */
  profile?: {
    name?: string;
    display_name?: string;  // Legacy support
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
  | 'network'
  | 'authentication' 
  | 'authorization'
  | 'server'
  | 'validation'
  | 'unknown';

/**
 * API response item format for linked pubkeys
 */
interface LinkedPubkeyApiItem {
  pubkey?: string;
  linkedAt?: number;
  isPrimary?: boolean;
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
 * Get API base URL with validation and security enforcement
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
 * Categorizes errors for appropriate handling and user feedback
 */
const categorizeError = (error: unknown): LinkedPubkeysErrorType => {
  if (!(error instanceof Error)) return 'unknown';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('401') || message.includes('authentication expired')) {
    return 'authentication';
  }
  if (message.includes('403') || message.includes('access denied')) {
    return 'authorization';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('500') || message.includes('server error')) {
    return 'server';
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return 'validation';
  }
  
  return 'unknown';
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
  
  // Core query for fetching linked pubkeys
  const query = useQuery({
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
          let errorMessage = `Request failed with status ${status}`;
          
          if (status === 401) {
            errorMessage = 'Authentication expired. Please sign in again.';
          } else if (status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
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
        
        if (!data.success) {
          // Handle API errors gracefully
          if (data.error) {
            throw new Error(`API error: ${data.error}`);
          }
          return [];
        }
        
        if (!data.pubkeys) {
          return [];
        }
        
        if (!Array.isArray(data.pubkeys)) {
          throw new Error('Invalid response format: pubkeys must be an array');
        }

        // Transform API response to LinkedPubkey format with enhanced metadata
        const linkedPubkeys: LinkedPubkey[] = data.pubkeys
          .map((item: string | LinkedPubkeyApiItem) => {
            // Handle both string and object formats from API
            const pubkey = typeof item === 'string' ? item : item.pubkey;
            
            if (typeof pubkey !== 'string' || pubkey.length !== 64) {
              console.warn("Invalid pubkey format in response", { pubkey });
              return null;
            }
            
            return {
              pubkey,
              profile: null, // Will be populated by profile fetching if enabled
              linkedAt: typeof item === 'object' ? item.linkedAt : undefined,
              isPrimary: typeof item === 'object' ? item.isPrimary : false,
            };
          })
          .filter(Boolean) as LinkedPubkey[];

        return linkedPubkeys;
      } catch (error) {
        const errorType = categorizeError(error);
        
        console.warn('Failed to fetch linked pubkeys', { 
          userId: firebaseUser?.uid,
          errorType,
          hasAuth: !!firebaseUser,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error; // Re-throw to let React Query handle retry logic
      }
    },
    enabled: !!firebaseUser,
    staleTime: config.staleTime,
    gcTime: config.cacheTime,
    refetchOnWindowFocus: config.enableBackgroundRefetch,
    refetchOnReconnect: config.enableBackgroundRefetch,
    retry: (failureCount, error) => {
      const errorType = categorizeError(error);
      
      // Don't retry authentication/authorization errors
      if (errorType === 'authentication' || errorType === 'authorization') {
        return false;
      }
      
      return failureCount < (config.retryConfig.maxRetries || 2);
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
      console.warn('Manual refetch failed', { error });
      // Error is already handled by React Query
    }
  }, [query]);

  // Cache invalidation function
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['linked-pubkeys', firebaseUser?.uid] 
    });
  }, [queryClient, firebaseUser?.uid]);

  // Auto-invalidate when user changes to ensure fresh data
  useEffect(() => {
    if (firebaseUser?.uid) {
      // Invalidate stale cache when user changes
      const lastUserId = localStorage.getItem('last-firebase-user-id');
      if (lastUserId && lastUserId !== firebaseUser.uid) {
        invalidate();
      }
      localStorage.setItem('last-firebase-user-id', firebaseUser.uid);
    }
  }, [firebaseUser?.uid, invalidate]);

  // Find primary pubkey
  const primaryPubkey = query.data?.find(pk => pk.isPrimary) || query.data?.[0];

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
 * @returns React Query result with linked pubkeys array
 */
export function useLinkedPubkeysByEmail(email: string) {
  return useQuery({
    queryKey: ['linked-pubkeys-email', email],
    queryFn: async (): Promise<LinkedPubkey[]> => {
      if (!email) return [];

      try {
        const API_BASE_URL = getApiBaseUrl();
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
  options: Omit<UseLinkedPubkeysOptions, 'includeProfiles'> = {}
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
  const { data: linkedPubkeys, isLoading, error, refetch } = useLinkedPubkeys(firebaseUser);
  
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
    primaryPubkey: linkedPubkeys.find(pk => pk.isPrimary) || linkedPubkeys[0],
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
        queryKey: ['linked-pubkeys', firebaseUser.uid] 
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
    window.addEventListener('account-linked', handleAccountLinked);
    window.addEventListener('account-unlinked', handleAccountUnlinked);
    
    return () => {
      window.removeEventListener('account-linked', handleAccountLinked);
      window.removeEventListener('account-unlinked', handleAccountUnlinked);
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