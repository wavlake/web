import { useState, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";
import { logAuthSuccess, logAuthError } from "@/lib/authLogger";
import { isValidPubkey, validatePubkeyOrThrow } from "@/lib/pubkeyUtils";
import { FirebaseUser, NostrSigner, AutoLinkResult } from "@/types/auth";

/**
 * Comprehensive state management for auto-linking operations
 */
type AutoLinkState = 'idle' | 'linking' | 'success' | 'error';

/**
 * Error types for specific error handling and user feedback
 * 
 * Each error type determines retry behavior and user messaging:
 * - 'network': Temporary network issues, retryable with exponential backoff
 * - 'rate_limit': API rate limiting, retryable with longer delays (HTTP 429)
 * - 'validation': Invalid input data, not retryable (user must fix input)
 * - 'duplicate': Account already linked, not retryable (operation unnecessary)
 * - 'permission': Authentication/authorization failures, not retryable (user must re-authenticate)
 * - 'timeout': Operation exceeded time limit, retryable with fresh attempt
 * - 'unknown': Unclassified errors, retryable with caution
 */
type AutoLinkErrorType = 
  | 'network' 
  | 'rate_limit' 
  | 'validation' 
  | 'duplicate' 
  | 'permission' 
  | 'timeout'
  | 'unknown';

/**
 * Configuration options for auto-linking behavior
 */
interface AutoLinkOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  initialRetryDelay?: number;
  /** Maximum retry delay in milliseconds (default: 10000) */
  maxRetryDelay?: number;
  /** Whether to show toast notifications (default: true) */
  showNotifications?: boolean;
  /** Custom timeout for linking operations in milliseconds (default: 15000) */
  timeout?: number;
}

/**
 * Hook state interface for comprehensive state management
 */
interface AutoLinkHookState {
  state: AutoLinkState;
  isLinking: boolean;
  lastError?: Error;
  lastErrorType?: AutoLinkErrorType;
  retryCount: number;
  lastSuccessTime?: number;
}

/**
 * Default configuration for auto-linking operations
 */
const DEFAULT_OPTIONS: Required<AutoLinkOptions> = {
  maxRetries: 3,
  initialRetryDelay: 1000,
  maxRetryDelay: 10000,
  showNotifications: true,
  timeout: 15000,
};

/**
 * Cache key for recent attempts to prevent duplicates
 */
const createAttemptKey = (firebaseUserId: string, pubkey?: string): string => {
  return `${firebaseUserId}:${pubkey || 'current'}`;
};

/**
 * Enhanced hook for automatically linking Firebase accounts with Nostr pubkeys.
 * 
 * This hook provides a comprehensive solution for linking Firebase authenticated users
 * with their Nostr public keys, including robust error handling, retry logic, and
 * performance optimizations.
 * 
 * @example
 * ```typescript
 * const { autoLink, isLinking, state, lastError } = useAutoLinkPubkey({
 *   maxRetries: 3,
 *   timeout: 15000,
 *   showNotifications: true
 * });
 * 
 * // Link account automatically
 * const result = await autoLink(firebaseUser, pubkey);
 * ```
 * 
 * @param options - Configuration options for auto-linking behavior
 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param options.initialRetryDelay - Initial retry delay in milliseconds (default: 1000)
 * @param options.maxRetryDelay - Maximum retry delay in milliseconds (default: 10000)
 * @param options.showNotifications - Whether to show toast notifications (default: true)
 * @param options.timeout - Custom timeout for linking operations in milliseconds (default: 15000)
 * @returns Hook interface with linking function and state management
 */
export function useAutoLinkPubkey(options: AutoLinkOptions = {}) {
  // Memoize configuration to prevent unnecessary re-renders
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  const { linkPubkey } = useFirebaseLegacyAuth();
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  const queryClient = useQueryClient();
  
  // Comprehensive state management
  const [hookState, setHookState] = useState<AutoLinkHookState>({
    state: 'idle',
    isLinking: false,
    retryCount: 0,
  });

  // Performance optimization: track recent linking attempts to prevent duplicates
  const recentAttempts = useRef<Map<string, { timestamp: number; accessed: number }>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Clears all timeouts to prevent memory leaks
   */
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = undefined;
    }
  }, []);
  
  /**
   * Clears the linking timeout if it exists.
   * 
   * This function safely cancels any pending timeout to prevent memory leaks
   * and unwanted timeout callbacks.
   */
  const clearLinkingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // Memoize error patterns with priority ordering for optimal categorization
  const errorPatterns = useMemo(() => [
    { type: 'permission' as AutoLinkErrorType, patterns: ['unauthorized', 'forbidden', '401', '403', 'permission'] },
    { type: 'rate_limit' as AutoLinkErrorType, patterns: ['rate limit', '429', 'too many requests'] },
    { type: 'timeout' as AutoLinkErrorType, patterns: ['timeout', 'aborted', 'request timeout'] },
    { type: 'validation' as AutoLinkErrorType, patterns: ['invalid', 'validation', 'bad request', '400'] },
    { type: 'duplicate' as AutoLinkErrorType, patterns: ['duplicate', 'already linked', 'already exists'] },
    { type: 'network' as AutoLinkErrorType, patterns: ['network', 'fetch', 'connection', 'offline'] },
  ], []);

  /**
   * Categorizes errors into specific types for appropriate handling using priority-based matching.
   * 
   * This function analyzes error messages to determine the appropriate error type,
   * which is used for retry logic and user-friendly error messages. Error types are
   * matched in priority order to ensure accurate categorization.
   * 
   * @param error - The error to categorize
   * @returns The categorized error type
   */
  const categorizeError = useCallback((error: unknown): AutoLinkErrorType => {
    if (!(error instanceof Error)) return 'unknown';
    
    const message = error.message.toLowerCase();
    
    // Find matching error type using priority-ordered patterns
    for (const { type, patterns } of errorPatterns) {
      if (patterns.some(pattern => message.includes(pattern))) {
        return type;
      }
    }
    
    return 'unknown';
  }, [errorPatterns]);

  /**
   * Determines if an error type is retryable.
   * 
   * Certain error types like network failures, timeouts, and rate limits are considered
   * temporary and worth retrying, while validation and permission errors are not.
   * 
   * @param errorType - The error type to check
   * @returns true if the error type is retryable, false otherwise
   */
  const isRetryableError = useCallback((errorType: AutoLinkErrorType): boolean => {
    return ['network', 'timeout', 'rate_limit', 'unknown'].includes(errorType);
  }, []);

  /**
   * Calculates exponential backoff delay with jitter
   */
  const calculateRetryDelay = useCallback((retryCount: number): number => {
    const exponentialDelay = config.initialRetryDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, config.maxRetryDelay);
  }, [config.initialRetryDelay, config.maxRetryDelay]);

  /**
   * Determines the appropriate linking strategy based on available parameters
   * 
   * @param pubkey - Optional pubkey for direct linking
   * @param signer - Optional signer for pubkey-based linking
   * @returns Linking strategy configuration
   */
  const determineLinkingStrategy = useCallback((pubkey?: string, signer?: NostrSigner) => {
    if (signer && pubkey) {
      return {
        type: 'signer-based' as const,
        execute: () => linkPubkey(pubkey, signer),
        successMessage: "Account linked successfully using Nostr signer"
      };
    } else {
      return {
        type: 'account-based' as const,
        execute: () => linkAccount(),
        successMessage: "Account linked successfully"
      };
    }
  }, [linkPubkey, linkAccount]);

  /**
   * Executes the linking operation with timeout protection
   * 
   * @param strategy - The linking strategy to execute
   * @returns Promise with linking result
   */
  const executeLinkingWithTimeout = useCallback(async (
    strategy: ReturnType<typeof determineLinkingStrategy>
  ): Promise<{ message: string }> => {
    return new Promise((resolve, reject) => {
      // Set up timeout protection to prevent hanging operations
      timeoutRef.current = setTimeout(() => {
        reject(new Error(`Linking operation timed out after ${config.timeout}ms`));
      }, config.timeout);

      // Execute the determined linking strategy
      strategy.execute()
        .then((result) => {
          clearLinkingTimeout();
          // Ensure consistent return format regardless of strategy type
          const message = typeof result === 'object' && result?.message 
            ? result.message 
            : strategy.successMessage;
          resolve({ message });
        })
        .catch((error) => {
          clearLinkingTimeout();
          reject(error);
        });
    });
  }, [config.timeout, clearLinkingTimeout]);

  /**
   * Performs the actual linking operation with modular strategy selection
   */
  const performLinking = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<{ message: string }> => {
    const strategy = determineLinkingStrategy(pubkey, signer);
    return executeLinkingWithTimeout(strategy);
  }, [determineLinkingStrategy, executeLinkingWithTimeout]);

  /**
   * Checks if a recent linking attempt was made for this user/pubkey combination
   * to prevent unnecessary duplicate calls
   */
  const hasRecentAttempt = useCallback((firebaseUser: FirebaseUser, pubkey?: string): boolean => {
    const key = createAttemptKey(firebaseUser.uid, pubkey);
    const attemptData = recentAttempts.current.get(key);
    
    if (!attemptData) return false;
    
    // Update access time for LRU behavior
    attemptData.accessed = Date.now();
    
    // Consider attempts within the last 2 minutes as recent
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
    return attemptData.timestamp > twoMinutesAgo;
  }, []);

  /**
   * Automatically cleans up expired cache entries
   */
  const scheduleCleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    
    cleanupTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const expiredCutoff = now - (30 * 60 * 1000); // 30 minutes
      const accessCutoff = now - (10 * 60 * 1000); // 10 minutes since last access
      
      // Use iterator for efficient deletion during iteration
      for (const [key, { timestamp, accessed }] of recentAttempts.current.entries()) {
        if (timestamp < expiredCutoff || accessed < accessCutoff) {
          recentAttempts.current.delete(key);
        }
      }
      
      // Schedule next cleanup if cache is not empty
      if (recentAttempts.current.size > 0) {
        scheduleCleanup();
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }, []);

  /**
   * Records a linking attempt to prevent duplicates with LRU-based cache management
   */
  const recordAttempt = useCallback((firebaseUser: FirebaseUser, pubkey?: string) => {
    const key = createAttemptKey(firebaseUser.uid, pubkey);
    const now = Date.now();
    
    recentAttempts.current.set(key, {
      timestamp: now,
      accessed: now
    });
    
    // Implement cache size limit with LRU eviction
    if (recentAttempts.current.size > 100) {
      // Find least recently accessed entry
      let lruKey: string | null = null;
      let oldestAccess = now;
      
      for (const [k, { accessed }] of recentAttempts.current.entries()) {
        if (accessed < oldestAccess) {
          oldestAccess = accessed;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        recentAttempts.current.delete(lruKey);
      }
    }
    
    // Schedule cleanup if not already scheduled
    if (!cleanupTimeoutRef.current && recentAttempts.current.size === 1) {
      scheduleCleanup();
    }
  }, [scheduleCleanup]);

  /**
   * Performs auto-linking with retry logic and comprehensive error handling
   */
  const autoLinkWithRetry = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner,
    attempt: number = 0
  ): Promise<AutoLinkResult> => {
    try {
      const result = await performLinking(firebaseUser, pubkey, signer);
      
      // Update state to success
      setHookState(prev => ({
        ...prev,
        state: 'success',
        isLinking: false,
        lastError: undefined,
        lastErrorType: undefined,
        lastSuccessTime: Date.now(),
      }));

      // Log successful linking with structured context
      logAuthSuccess('account-linking', firebaseUser, pubkey);
      
      // Invalidate linked pubkeys cache to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ["linked-pubkeys", firebaseUser.uid] 
      });
      
      // Emit event for other components to react to auto-linking
      window.dispatchEvent(new CustomEvent('account-linked', { 
        detail: { 
          pubkey: pubkey,
          firebaseUid: firebaseUser.uid,
          success: true,
          isAutoLink: true
        } 
      }));
      
      // Show success notification if enabled
      if (config.showNotifications) {
        toast.success("Account Linked", {
          description: "Your Nostr account has been linked to your Wavlake account.",
        });
      }
      
      return { success: true, message: result.message };
    } catch (error) {
      const errorType = categorizeError(error);
      const isRetryable = isRetryableError(errorType);
      const shouldRetry = isRetryable && attempt < config.maxRetries;

      // Log the error with structured context including retry attempt
      logAuthError('account-linking', error, firebaseUser, pubkey);

      if (shouldRetry) {
        // Calculate delay and retry
        const delay = calculateRetryDelay(attempt);
        
        // Update state to show retry in progress
        setHookState(prev => ({
          ...prev,
          retryCount: attempt + 1,
        }));

        // Wait for calculated delay before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return autoLinkWithRetry(firebaseUser, pubkey, signer, attempt + 1);
      } else {
        // Final failure - update state
        const finalError = error instanceof Error ? error : new Error("Auto-linking failed");
        
        setHookState(prev => ({
          ...prev,
          state: 'error',
          isLinking: false,
          lastError: finalError,
          lastErrorType: errorType,
        }));

        // Show user-friendly notice (linking failure is not critical)
        if (config.showNotifications) {
          const notificationMessage = errorType === 'duplicate' 
            ? "Account already linked to your Wavlake profile."
            : "Unable to link accounts automatically. You can manage this in Settings later.";
          
          toast.warning("Linking Notice", {
            description: notificationMessage,
          });
        }

        return { 
          success: false, 
          error: finalError,
          errorType,
          retryable: isRetryable,
        };
      }
    }
  }, [
    performLinking, 
    categorizeError, 
    isRetryableError, 
    calculateRetryDelay, 
    config,
    queryClient
  ]);

  /**
   * Main auto-linking function with comprehensive validation and security
   * 
   * @param firebaseUser - The authenticated Firebase user (required for all linking operations)
   * @param pubkey - The Nostr pubkey to link (optional, if not provided will delegate to linkAccount hook which determines pubkey from current authentication context)
   * @param signer - Optional Nostr signer for direct pubkey-based linking (requires pubkey parameter)
   * @returns Promise resolving to AutoLinkResult indicating success/failure with detailed error context
   */
  const autoLink = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<AutoLinkResult> => {
    // Input sanitization for security - remove whitespace that could bypass validation
    const sanitizedPubkey = pubkey?.trim();
    // Enhanced Firebase user validation
    if (!firebaseUser) {
      const error = new Error("Firebase user is required for linking - user must be authenticated");
      logAuthError('account-linking-validation', error);
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
        lastErrorType: 'validation',
      }));
      
      // Show user-friendly error for authentication failures
      if (config.showNotifications) {
        toast.error("Authentication Required", {
          description: "Please sign in to your Wavlake account before linking.",
        });
      }
      
      throw error;
    }

    // Validate Firebase user has required properties
    if (!firebaseUser.uid || !firebaseUser.getIdToken) {
      const error = new Error("Invalid Firebase user - missing required authentication properties");
      logAuthError('account-linking-validation', error, firebaseUser);
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
        lastErrorType: 'validation',
      }));
      
      if (config.showNotifications) {
        toast.error("Authentication Error", {
          description: "Authentication session is invalid. Please sign in again.",
        });
      }
      
      throw error;
    }

    // Comprehensive pubkey validation using centralized validation logic
    // This prevents bypassing validation through different code paths
    if (sanitizedPubkey) {
      try {
        // Use centralized validation function to ensure consistency
        // and prevent validation logic duplication across the codebase
        validatePubkeyOrThrow(sanitizedPubkey, 'account linking');
      } catch (validationError) {
        const error = validationError instanceof Error ? validationError : new Error("Invalid pubkey format");
        
        // Log validation error with enhanced context for debugging
        logAuthError('account-linking-validation', error, firebaseUser, sanitizedPubkey);
        
        // Update hook state with detailed error information
        setHookState(prev => ({
          ...prev,
          state: 'error',
          lastError: error,
          lastErrorType: 'validation',
        }));
        
        // Show user-friendly error with actionable guidance
        if (config.showNotifications) {
          toast.error("Invalid Account", {
            description: "The provided account identifier is not valid. Please check the format and try again.",
          });
        }
        
        // Re-throw to prevent silent failure and maintain error propagation
        throw error;
      }
    }

    // Performance optimization: check for recent attempts to prevent duplicates
    if (hasRecentAttempt(firebaseUser, sanitizedPubkey)) {
      return { 
        success: false, 
        error: new Error("Recent linking attempt detected, skipping duplicate call"),
        errorType: 'duplicate',
        retryable: false,
      };
    }

    // Record this attempt
    recordAttempt(firebaseUser, sanitizedPubkey);

    // Update state to linking
    setHookState(prev => ({
      ...prev,
      state: 'linking',
      isLinking: true,
      retryCount: 0,
      lastError: undefined,
      lastErrorType: undefined,
    }));

    // Perform linking with retry logic using sanitized pubkey
    return autoLinkWithRetry(firebaseUser, sanitizedPubkey, signer);
  }, [hasRecentAttempt, recordAttempt, autoLinkWithRetry, config]);

  /**
   * Resets the hook state to idle
   */
  const resetState = useCallback(() => {
    clearAllTimeouts();
    setHookState({
      state: 'idle',
      isLinking: false,
      retryCount: 0,
    });
  }, [clearAllTimeouts]);

  /**
   * Clears the last error state
   */
  const clearError = useCallback(() => {
    setHookState(prev => ({
      ...prev,
      state: prev.state === 'error' ? 'idle' : prev.state,
      lastError: undefined,
      lastErrorType: undefined,
    }));
  }, []);

  // Cleanup timeouts and cache on unmount
  const cleanup = useCallback(() => {
    clearAllTimeouts();
    recentAttempts.current.clear();
  }, [clearAllTimeouts]);

  return {
    // Core functionality
    autoLink,
    
    // State management
    state: hookState.state,
    isLinking: hookState.isLinking,
    lastError: hookState.lastError,
    lastErrorType: hookState.lastErrorType,
    retryCount: hookState.retryCount,
    lastSuccessTime: hookState.lastSuccessTime,
    
    // Utility functions
    resetState,
    clearError,
    cleanup,
    
    // Configuration (read-only)
    config: config as Readonly<Required<AutoLinkOptions>>,
  };
}