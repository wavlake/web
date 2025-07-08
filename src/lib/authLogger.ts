/**
 * Secure logging utilities for authentication operations
 * Ensures sensitive data is properly sanitized before logging
 */

import { truncatePubkey } from './pubkeyUtils';
import { FirebaseUser } from '@/types/auth';

interface AuthLogContext {
  operation: string;
  firebaseUid?: string;
  firebaseEmail?: string | null;
  pubkey?: string;
  linkedPubkeysCount?: number;
  error?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Sanitizes log context to prevent sensitive data exposure
 * @param context - The raw context object
 * @returns Sanitized context safe for logging
 */
function sanitizeLogContext(context: AuthLogContext): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  
  // Copy safe fields
  if (context.operation) sanitized.operation = context.operation;
  if (context.firebaseUid) sanitized.firebaseUid = context.firebaseUid;
  if (context.linkedPubkeysCount !== undefined) sanitized.linkedPubkeysCount = context.linkedPubkeysCount;
  
  // Sanitize email - only show domain for privacy
  if (context.firebaseEmail) {
    const emailParts = context.firebaseEmail.split('@');
    sanitized.firebaseEmailDomain = emailParts.length > 1 ? emailParts[1] : 'unknown';
  }
  
  // Sanitize pubkey
  if (context.pubkey) {
    sanitized.pubkey = truncatePubkey(context.pubkey);
  }
  
  // Handle error safely
  if (context.error) {
    sanitized.error = typeof context.error === 'string' ? context.error : 'Error object';
  }
  
  // Copy other safe fields (avoiding functions and complex objects)
  Object.keys(context).forEach(key => {
    if (!['operation', 'firebaseUid', 'firebaseEmail', 'pubkey', 'error', 'linkedPubkeysCount'].includes(key)) {
      const value = context[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
  });
  
  return sanitized;
}

/**
 * Logger for authentication success events
 */
export function logAuthSuccess(operation: string, firebaseUser?: FirebaseUser, pubkey?: string): void {
  const context = sanitizeLogContext({
    operation,
    firebaseUid: firebaseUser?.uid,
    firebaseEmail: firebaseUser?.email,
    pubkey
  });
  
  console.info(`Authentication success: ${operation}`, context);
}

/**
 * Logger for authentication errors with appropriate severity
 */
export function logAuthError(operation: string, error: unknown, firebaseUser?: FirebaseUser, pubkey?: string, linkedPubkeysCount?: number): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  const context = sanitizeLogContext({
    operation,
    firebaseUid: firebaseUser?.uid,
    firebaseEmail: firebaseUser?.email,
    pubkey,
    linkedPubkeysCount,
    error: errorMessage
  });
  
  // Use appropriate log level based on operation criticality
  if (operation === 'account-linking') {
    // Account linking failures are warnings since auth can continue
    console.warn(`Authentication warning: ${operation}`, context);
  } else {
    // Other auth failures are errors
    console.error(`Authentication error: ${operation}`, context);
  }
}

/**
 * Logger for authentication info events
 */
export function logAuthInfo(operation: string, firebaseUser?: FirebaseUser, pubkey?: string, linkedPubkeysCount?: number): void {
  const context = sanitizeLogContext({
    operation,
    firebaseUid: firebaseUser?.uid,
    firebaseEmail: firebaseUser?.email,
    pubkey,
    linkedPubkeysCount
  });
  
  console.info(`Authentication info: ${operation}`, context);
}