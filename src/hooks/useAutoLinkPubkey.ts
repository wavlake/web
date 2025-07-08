import { useState, useCallback, useRef } from "react";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";
import { logAuthSuccess, logAuthError } from "@/lib/authLogger";
import { isValidPubkey } from "@/lib/pubkeyUtils";

interface FirebaseUser {
  uid: string;
  email: string | null;
  getIdToken: () => Promise<string>;
}

interface NostrSigner {
  // Define signer interface if needed
  [key: string]: unknown;
}

/**
 * Comprehensive state management for auto-linking operations
 */
type AutoLinkState = 'idle' | 'linking' | 'success' | 'error';

/**
 * Error types for specific error handling
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
 * Comprehensive result interface for auto-linking operations
 */
interface AutoLinkResult {
  success: boolean;
  message?: string;
  error?: Error;
  errorType?: AutoLinkErrorType;
  retryable?: boolean;
}

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
 * Enhanced hook for automatically linking Firebase accounts with Nostr pubkeys
 * 
 * Features:
 * - Comprehensive state management with idle, linking, success, error states
 * - Retry logic with exponential backoff for transient failures
 * - Intelligent error categorization and handling
 * - Performance optimizations to prevent unnecessary API calls
 * - Configurable timeout and retry behavior
 * - Non-blocking design that doesn't interfere with authentication flows
 * 
 * @param options - Configuration options for auto-linking behavior
 * @returns Hook interface with linking function and state management
 */
export function useAutoLinkPubkey(options: AutoLinkOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { linkPubkey } = useFirebaseLegacyAuth();
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  
  // Comprehensive state management
  const [hookState, setHookState] = useState<AutoLinkHookState>({
    state: 'idle',
    isLinking: false,
    retryCount: 0,
  });

  // Performance optimization: track recent linking attempts to prevent duplicates
  const recentAttempts = useRef<Map<string, number>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Clears the linking timeout if it exists
   */
  const clearLinkingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  /**
   * Categorizes errors into specific types for appropriate handling
   */
  const categorizeError = useCallback((error: unknown): AutoLinkErrorType => {
    if (!(error instanceof Error)) return 'unknown';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('timeout') || message.includes('aborted')) {
      return 'timeout';
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation';
    }
    if (message.includes('duplicate') || message.includes('already linked')) {
      return 'duplicate';
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'permission';
    }
    
    return 'unknown';
  }, []);

  /**
   * Determines if an error type is retryable
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
   * Performs the actual linking operation with timeout
   */
  const performLinking = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<{ message: string }> => {
    return new Promise((resolve, reject) => {
      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        reject(new Error('Linking operation timed out'));
      }, config.timeout);

      // Perform the actual linking
      const linkingPromise = (async () => {
        if (signer && pubkey) {
          await linkPubkey(pubkey, signer);
          return { message: "Account linked successfully using signer" };
        } else {
          return await linkAccount();
        }
      })();

      linkingPromise
        .then((result) => {
          clearLinkingTimeout();
          resolve(result);
        })
        .catch((error) => {
          clearLinkingTimeout();
          reject(error);
        });
    });
  }, [linkPubkey, linkAccount, config.timeout, clearLinkingTimeout]);

  /**
   * Checks if a recent linking attempt was made for this user/pubkey combination
   * to prevent unnecessary duplicate calls
   */
  const hasRecentAttempt = useCallback((firebaseUser: FirebaseUser, pubkey?: string): boolean => {
    const key = `${firebaseUser.uid}:${pubkey || 'current'}`;
    const lastAttempt = recentAttempts.current.get(key);
    
    if (!lastAttempt) return false;
    
    // Consider attempts within the last 5 minutes as recent
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return lastAttempt > fiveMinutesAgo;
  }, []);

  /**
   * Records a linking attempt to prevent duplicates
   */
  const recordAttempt = useCallback((firebaseUser: FirebaseUser, pubkey?: string) => {
    const key = `${firebaseUser.uid}:${pubkey || 'current'}`;
    recentAttempts.current.set(key, Date.now());
    
    // Clean up old entries to prevent memory leaks
    if (recentAttempts.current.size > 100) {
      const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour ago
      for (const [k, timestamp] of recentAttempts.current.entries()) {
        if (timestamp < cutoff) {
          recentAttempts.current.delete(k);
        }
      }
    }
  }, []);

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

      // Log successful linking
      logAuthSuccess('account-linking', firebaseUser, pubkey);
      
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

      // Log the error with appropriate context
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
    config.maxRetries, 
    config.showNotifications
  ]);

  /**
   * Main auto-linking function with comprehensive validation and optimization
   * 
   * @param firebaseUser - The authenticated Firebase user (required)
   * @param pubkey - The Nostr pubkey to link (optional, will use current user's pubkey if not provided)
   * @param signer - Optional Nostr signer for direct linking
   * @returns Promise resolving to AutoLinkResult indicating success/failure
   */
  const autoLink = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<AutoLinkResult> => {
    // Validation
    if (!firebaseUser) {
      const error = new Error("Firebase user is required for linking");
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
        lastErrorType: 'validation',
      }));
      throw error;
    }

    // Validate pubkey if provided
    if (pubkey && !isValidPubkey(pubkey)) {
      const error = new Error("Invalid pubkey format provided for linking");
      logAuthError('account-linking-validation', error, firebaseUser, pubkey);
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
        lastErrorType: 'validation',
      }));
      throw error;
    }

    // Performance optimization: check for recent attempts to prevent duplicates
    if (hasRecentAttempt(firebaseUser, pubkey)) {
      return { 
        success: false, 
        error: new Error("Recent linking attempt detected, skipping duplicate call"),
        errorType: 'duplicate',
        retryable: false,
      };
    }

    // Record this attempt
    recordAttempt(firebaseUser, pubkey);

    // Update state to linking
    setHookState(prev => ({
      ...prev,
      state: 'linking',
      isLinking: true,
      retryCount: 0,
      lastError: undefined,
      lastErrorType: undefined,
    }));

    // Perform linking with retry logic
    return autoLinkWithRetry(firebaseUser, pubkey, signer);
  }, [hasRecentAttempt, recordAttempt, autoLinkWithRetry]);

  /**
   * Resets the hook state to idle
   */
  const resetState = useCallback(() => {
    clearLinkingTimeout();
    setHookState({
      state: 'idle',
      isLinking: false,
      retryCount: 0,
    });
  }, [clearLinkingTimeout]);

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

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    clearLinkingTimeout();
  }, [clearLinkingTimeout]);

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