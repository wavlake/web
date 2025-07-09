/**
 * Pure Nostr authentication hook
 * 
 * This hook handles all Nostr authentication methods without any UI coupling,
 * extracted from the complex NostrAuthStep component in the legacy system.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { NLogin, type NLoginType } from '@nostrify/react/login';
import { getPublicKey } from 'nostr-tools';
import { decode } from 'nostr-tools/nip19';
import type {
  NostrAuthResult,
  NostrAuthMethod,
  NostrCredentials,
  AuthError,
  AuthErrorType
} from '@/types/authFlow';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Categorize errors for appropriate handling and user feedback
 */
function categorizeError(error: unknown): AuthErrorType {
  if (!(error instanceof Error)) return 'unknown';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('extension') || message.includes('nostr not found')) {
    return 'authentication';
  }
  if (message.includes('invalid') || message.includes('format') || message.includes('validation')) {
    return 'validation';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('timeout')) {
    return 'network';
  }
  if (message.includes('permission') || message.includes('denied')) {
    return 'authorization';
  }
  
  return 'unknown';
}

/**
 * Convert technical error messages into user-friendly, actionable feedback
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('extension') || message.includes('nostr not found')) {
      return 'Nostr extension not found. Please install a NIP-07 compatible extension like Alby or nos2x.';
    }
    if (message.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Connection timeout. Please try again.';
    }
    if (message.includes('invalid nsec') || message.includes('invalid private key')) {
      return 'Invalid private key format. Please check your nsec and try again.';
    }
    if (message.includes('invalid bunker') || message.includes('invalid uri')) {
      return 'Invalid bunker URI format. Please check the URI and try again.';
    }
    if (message.includes('permission') || message.includes('denied')) {
      return 'Permission denied. Please check your extension settings.';
    }
    
    return 'Authentication failed. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate nsec format following Nostr standards
 */
function validateNsec(nsec: string): { isValid: boolean; error?: string } {
  if (!nsec || !nsec.trim()) {
    return { isValid: false, error: 'Private key is required' };
  }
  
  if (!nsec.startsWith('nsec1')) {
    return { isValid: false, error: 'Private key must start with nsec1' };
  }
  
  if (nsec.length !== 63) {
    return { isValid: false, error: 'Private key must be 63 characters long' };
  }
  
  // Basic bech32 validation
  const validChars = /^[a-z0-9]+$/;
  if (!validChars.test(nsec.slice(5))) {
    return { isValid: false, error: 'Private key contains invalid characters' };
  }
  
  // Try to decode to validate format
  try {
    decode(nsec);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid private key format' };
  }
}

/**
 * Validate bunker URI format
 */
function validateBunkerUri(uri: string): { isValid: boolean; error?: string } {
  if (!uri || !uri.trim()) {
    return { isValid: false, error: 'Bunker URI is required' };
  }
  
  if (!uri.startsWith('bunker://')) {
    return { isValid: false, error: 'URI must start with bunker://' };
  }
  
  try {
    new URL(uri);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URI format' };
  }
}

/**
 * Validate pubkey format
 */
function validatePubkey(pubkey: string): boolean {
  if (!pubkey || typeof pubkey !== 'string') return false;
  if (pubkey.length !== 64) return false;
  return /^[a-f0-9]{64}$/i.test(pubkey);
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Pure Nostr authentication hook
 * 
 * This hook provides all Nostr authentication functionality without any UI coupling.
 * It's extracted from the legacy NostrAuthStep component and focuses purely on
 * business logic.
 * 
 * Features:
 * - Support for extension, nsec, and bunker authentication
 * - Comprehensive validation and error handling
 * - User-friendly error messages
 * - No UI dependencies
 * 
 * @example
 * ```tsx
 * function NostrAuthForm() {
 *   const { authenticate, isLoading, error, supportedMethods } = useNostrAuthentication();
 *   
 *   const handleSubmit = async () => {
 *     try {
 *       const login = await authenticate('extension', { method: 'extension' });
 *       onSuccess(login);
 *     } catch (error) {
 *       // Error is already handled by the hook
 *     }
 *   };
 * }
 * ```
 */
export function useNostrAuthentication(): NostrAuthResult {
  const { nostr } = useNostr();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always include all methods - let users attempt them and get helpful feedback
  const supportedMethods = useMemo((): NostrAuthMethod[] => {
    return ['extension', 'nsec', 'bunker'];
  }, []);

  /**
   * Authenticate with extension (NIP-07)
   */
  const authenticateWithExtension = useCallback(async () => {
    if (typeof window === 'undefined' || !('nostr' in window)) {
      throw new Error('Nostr extension not found. Please install a NIP-07 compatible extension like Alby, nos2x, or Flamingo, then refresh the page.');
    }

    try {
      const login = await NLogin.fromExtension();
      
      if (!validatePubkey(login.pubkey)) {
        throw new Error('Invalid pubkey received from extension');
      }

      return login;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          throw new Error('Authentication cancelled. Please try again and approve the request in your extension.');
        }
        if (error.message.includes('not found') || error.message.includes('undefined')) {
          throw new Error('Extension not responding. Please check that your Nostr extension is enabled and try again.');
        }
      }
      throw error;
    }
  }, []);

  /**
   * Authenticate with private key (nsec)
   */
  const authenticateWithNsec = useCallback(async (nsec: string) => {
    const validation = validateNsec(nsec);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid private key');
    }

    const login = NLogin.fromNsec(nsec);
    
    if (!validatePubkey(login.pubkey)) {
      throw new Error('Invalid pubkey generated from private key');
    }

    return login;
  }, []);

  /**
   * Authenticate with bunker URI (NIP-46)
   */
  const authenticateWithBunker = useCallback(async (bunkerUri: string) => {
    const validation = validateBunkerUri(bunkerUri);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid bunker URI');
    }

    const login = await NLogin.fromBunker(bunkerUri, nostr);
    
    if (!validatePubkey(login.pubkey)) {
      throw new Error('Invalid pubkey received from bunker');
    }

    return login;
  }, [nostr]);

  /**
   * Main authentication function
   */
  const authenticate = useCallback(async (
    method: NostrAuthMethod,
    credentials: NostrCredentials
  ) => {
    if (isLoading) {
      throw new Error('Authentication already in progress');
    }

    setIsLoading(true);
    setError(null);

    try {
      let login: NLoginType;

      switch (method) {
        case 'extension':
          if (credentials.method !== 'extension') {
            throw new Error('Invalid credentials for extension method');
          }
          login = await authenticateWithExtension();
          break;

        case 'nsec':
          if (credentials.method !== 'nsec') {
            throw new Error('Invalid credentials for nsec method');
          }
          login = await authenticateWithNsec(credentials.nsec);
          break;

        case 'bunker':
          if (credentials.method !== 'bunker') {
            throw new Error('Invalid credentials for bunker method');
          }
          login = await authenticateWithBunker(credentials.bunkerUri);
          break;

        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }

      setIsLoading(false);
      return login;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, [isLoading, authenticateWithExtension, authenticateWithNsec, authenticateWithBunker]);

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    authenticate,
    isLoading,
    error,
    supportedMethods,
    clearError,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract pubkey from nsec without performing full authentication
 * Useful for real-time validation and mismatch detection
 */
export function extractPubkeyFromNsec(nsec: string): string | null {
  try {
    const validation = validateNsec(nsec);
    if (!validation.isValid) return null;

    const { data } = decode(nsec);
    return getPublicKey(data as Uint8Array);
  } catch {
    return null;
  }
}

/**
 * Check if two pubkeys match (useful for mismatch detection)
 */
export function checkPubkeyMatch(expected: string, actual: string): boolean {
  return expected === actual;
}

/**
 * Get method display name for UI
 */
export function getMethodDisplayName(method: NostrAuthMethod): string {
  switch (method) {
    case 'extension':
      return 'Browser Extension';
    case 'nsec':
      return 'Private Key';
    case 'bunker':
      return 'Remote Signer';
    default:
      return method;
  }
}

/**
 * Get method description for UI
 */
export function getMethodDescription(method: NostrAuthMethod): string {
  switch (method) {
    case 'extension':
      return 'One-click login using your browser extension';
    case 'nsec':
      return 'Sign in with your private key (nsec)';
    case 'bunker':
      return 'Connect to remote signers and hardware wallets';
    default:
      return '';
  }
}