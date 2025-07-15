import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";
import { validatePubkeyOrThrow } from "@/lib/pubkeyUtils";
import { FirebaseUser, NostrSigner, AutoLinkResult } from "@/types/auth";

/**
 * Simple state management for auto-linking operations
 */
type AutoLinkState = 'idle' | 'linking' | 'success' | 'error';

/**
 * Configuration options for auto-linking behavior
 */
interface AutoLinkOptions {
  /** Whether to show toast notifications (default: true) */
  showNotifications?: boolean;
}

/**
 * Hook state interface for simple state management
 */
interface AutoLinkHookState {
  state: AutoLinkState;
  isLinking: boolean;
  lastError?: Error;
}

/**
 * Default configuration for auto-linking operations
 */
const DEFAULT_OPTIONS: Required<AutoLinkOptions> = {
  showNotifications: true,
};

/**
 * Simple hook for automatically linking Firebase accounts with Nostr pubkeys.
 * 
 * @example
 * ```typescript
 * const { autoLink, isLinking, state, lastError } = useAutoLinkPubkey({
 *   showNotifications: true
 * });
 * 
 * // Link account automatically
 * const result = await autoLink(firebaseUser, pubkey);
 * ```
 * 
 * @param options - Configuration options for auto-linking behavior
 * @param options.showNotifications - Whether to show toast notifications (default: true)
 * @returns Hook interface with linking function and state management
 */
export function useAutoLinkPubkey(options: AutoLinkOptions = {}) {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  const { user: currentUser } = useFirebaseAuth();
  const queryClient = useQueryClient();
  
  const [hookState, setHookState] = useState<AutoLinkHookState>({
    state: 'idle',
    isLinking: false,
  });

  /**
   * Determines the appropriate linking strategy based on available parameters
   */
  const determineLinkingStrategy = useCallback((pubkey?: string, signer?: NostrSigner) => {
    // For now, we'll use the account linking hook which links the current user
    // This could be enhanced in the future to support linking arbitrary pubkeys
    return {
      execute: () => linkAccount(),
      successMessage: "Account linked successfully"
    };
  }, [linkAccount]);

  /**
   * Performs the actual linking operation
   */
  const performLinking = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<{ message: string }> => {
    const strategy = determineLinkingStrategy(pubkey, signer);
    
    try {
      const result = await strategy.execute();
      const message = typeof result === 'object' && result?.message 
        ? result.message 
        : strategy.successMessage;
      return { message };
    } catch (error) {
      const enhancedError = error instanceof Error 
        ? error 
        : new Error(`Linking failed: ${String(error)}`);
      throw enhancedError;
    }
  }, [determineLinkingStrategy]);

  /**
   * Validates Firebase user for auto-linking operations
   */
  const validateFirebaseUser = useCallback((firebaseUser: FirebaseUser) => {
    if (!firebaseUser) {
      const error = new Error("Firebase user is required for linking");
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
      }));
      
      if (config.showNotifications) {
        toast.error("Authentication Required", {
          description: "Please sign in to your Wavlake account before linking.",
        });
      }
      
      throw error;
    }

    if (!firebaseUser.uid || !firebaseUser.getIdToken) {
      const error = new Error("Invalid Firebase user - missing required properties");
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
      }));
      
      if (config.showNotifications) {
        toast.error("Authentication Error", {
          description: "Authentication session is invalid. Please sign in again.",
        });
      }
      
      throw error;
    }
  }, [config.showNotifications]);

  /**
   * Validates pubkey format for auto-linking operations
   */
  const validatePubkeyFormat = useCallback((pubkey: string) => {
    try {
      validatePubkeyOrThrow(pubkey, 'account linking');
    } catch (validationError) {
      const error = validationError instanceof Error ? validationError : new Error("Invalid pubkey format");
      
      setHookState(prev => ({
        ...prev,
        state: 'error',
        lastError: error,
      }));
      
      if (config.showNotifications) {
        toast.error("Invalid Account", {
          description: "The provided account identifier is not valid. Please check the format and try again.",
        });
      }
      
      throw error;
    }
  }, [config.showNotifications]);

  /**
   * Main auto-linking function with simple validation and error handling
   */
  const autoLink = useCallback(async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<AutoLinkResult> => {
    const sanitizedPubkey = pubkey?.trim();
    
    // Validate inputs
    validateFirebaseUser(firebaseUser);
    if (sanitizedPubkey) {
      validatePubkeyFormat(sanitizedPubkey);
    }
    
    // Update state to linking
    setHookState(prev => ({
      ...prev,
      state: 'linking',
      isLinking: true,
      lastError: undefined,
    }));

    try {
      const result = await performLinking(firebaseUser, sanitizedPubkey, signer);
      
      // Update state to success
      setHookState(prev => ({
        ...prev,
        state: 'success',
        isLinking: false,
        lastError: undefined,
      }));
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ["linked-pubkeys", firebaseUser.uid] 
      });
      
      // Emit event for other components
      window.dispatchEvent(new CustomEvent('account-linked', { 
        detail: { 
          pubkey: sanitizedPubkey,
          firebaseUid: firebaseUser.uid,
          success: true,
          isAutoLink: true
        } 
      }));
      
      // Show success notification
      if (config.showNotifications) {
        toast.success("Account Linked", {
          description: "Your Nostr account has been linked to your Wavlake account.",
        });
      }
      
      return { success: true, message: result.message };
    } catch (error) {
      const finalError = error instanceof Error ? error : new Error("Auto-linking failed");
      
      setHookState(prev => ({
        ...prev,
        state: 'error',
        isLinking: false,
        lastError: finalError,
      }));

      // Show user-friendly error message
      if (config.showNotifications) {
        const isDuplicate = finalError.message.toLowerCase().includes('duplicate') || 
                           finalError.message.toLowerCase().includes('already linked');
        
        const notificationMessage = isDuplicate
          ? "Account already linked to your Wavlake profile."
          : "Unable to link accounts automatically. You can manage this in Settings later.";
        
        toast.warning("Linking Notice", {
          description: notificationMessage,
        });
      }

      return { 
        success: false, 
        error: finalError,
      };
    }
  }, [validateFirebaseUser, validatePubkeyFormat, performLinking, config, queryClient]);

  /**
   * Resets the hook state to idle
   */
  const resetState = useCallback(() => {
    setHookState({
      state: 'idle',
      isLinking: false,
    });
  }, []);

  /**
   * Clears the last error state
   */
  const clearError = useCallback(() => {
    setHookState(prev => ({
      ...prev,
      state: prev.state === 'error' ? 'idle' : prev.state,
      lastError: undefined,
    }));
  }, []);

  return {
    // Core functionality
    autoLink,
    
    // State management
    state: hookState.state,
    isLinking: hookState.isLinking,
    lastError: hookState.lastError,
    
    // Utility functions
    resetState,
    clearError,
    
    // Configuration (read-only)
    config: config as Readonly<Required<AutoLinkOptions>>,
  };
}