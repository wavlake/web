/**
 * Authentication Helper Functions
 * 
 * Shared utilities for authentication flows, including validation,
 * error handling, and common auth operations.
 */

import { NostrAuthMethod } from '@/types/authFlow';

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  
  return { valid: true };
}

/**
 * Validates nsec private key format
 */
export function isValidNsec(nsec: string): boolean {
  return nsec.startsWith('nsec1') && nsec.length === 63;
}

/**
 * Validates bunker URI format
 */
export function isValidBunkerUri(uri: string): boolean {
  return uri.startsWith('bunker://') && uri.includes('@');
}

/**
 * Gets supported Nostr authentication methods based on environment
 */
export function getSupportedNostrMethods(): NostrAuthMethod[] {
  const methods: NostrAuthMethod[] = ['nsec'];
  
  // Check if window.nostr is available (browser extension)
  if (typeof window !== 'undefined' && window.nostr) {
    methods.unshift('extension');
  }
  
  // Bunker is always supported
  methods.push('bunker');
  
  return methods;
}

/**
 * Formats auth error messages for display
 */
export function formatAuthError(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific Firebase errors
    if (error.message.includes('auth/user-not-found')) {
      return 'No account found with this email address';
    }
    if (error.message.includes('auth/wrong-password')) {
      return 'Incorrect password';
    }
    if (error.message.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists';
    }
    if (error.message.includes('auth/weak-password')) {
      return 'Password is too weak. Please choose a stronger password';
    }
    if (error.message.includes('auth/invalid-email')) {
      return 'Invalid email address';
    }
    
    // Handle Nostr errors
    if (error.message.includes('User rejected')) {
      return 'Authentication was cancelled';
    }
    if (error.message.includes('No extension')) {
      return 'No Nostr extension found. Please install a Nostr browser extension';
    }
    
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Generates a display name from pubkey for fallback
 */
export function generateDisplayName(pubkey: string): string {
  return `User ${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
}

/**
 * Checks if a pubkey is valid hex format
 */
export function isValidPubkey(pubkey: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(pubkey);
}

/**
 * Sanitizes user input for display
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Delays execution for testing and UX purposes
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}