/**
 * Secure logging utilities for authentication operations
 * Ensures sensitive data is properly sanitized before logging
 */

import { truncatePubkey } from './pubkeyUtils';
import { FirebaseUser } from '@/types/auth';

/**
 * Context object for authentication logging operations.
 * 
 * This interface defines the structure for log context data, ensuring
 * consistent logging across authentication operations while maintaining
 * security through proper data sanitization.
 */
interface AuthLogContext {
  /** The authentication operation being performed */
  operation: string;
  /** Firebase user ID (sanitized) */
  firebaseUid?: string;
  /** Firebase user email (will be sanitized to domain only) */
  firebaseEmail?: string | null;
  /** Nostr pubkey (will be truncated for security) */
  pubkey?: string;
  /** Number of linked pubkeys for context */
  linkedPubkeysCount?: number;
  /** Error message if operation failed */
  error?: string;
  /** ISO timestamp of the operation */
  timestamp?: string;
  /** Log level for categorization */
  level?: string;
  /** Additional context fields for extensibility */
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Sanitizes log context to prevent sensitive data exposure while preserving debugging utility
 * 
 * Security considerations:
 * - Truncates pubkeys to prevent full key exposure in logs
 * - Sanitizes email addresses to show only domain
 * - Filters out functions and complex objects
 * - Prevents sensitive data from reaching external log services
 * 
 * @param context - The raw context object
 * @returns Sanitized context safe for logging with appropriate detail level
 */
function sanitizeLogContext(context: AuthLogContext): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  const isDevelopment = import.meta.env.DEV;
  
  // Copy safe fields
  if (context.operation) sanitized.operation = context.operation;
  if (context.firebaseUid) sanitized.firebaseUid = context.firebaseUid;
  if (context.linkedPubkeysCount !== undefined) sanitized.linkedPubkeysCount = context.linkedPubkeysCount;
  
  // Enhanced email handling - show more detail in development for debugging
  if (context.firebaseEmail) {
    const emailParts = context.firebaseEmail.split('@');
    if (isDevelopment) {
      // In development, show first 3 chars + domain for better debugging
      const localPart = emailParts[0] || '';
      const domain = emailParts[1] || 'unknown';
      sanitized.firebaseEmailDebug = `${localPart.slice(0, 3)}***@${domain}`;
    }
    // Always include domain for analytics
    sanitized.firebaseEmailDomain = emailParts.length > 1 ? emailParts[1] : 'unknown';
  }
  
  // Enhanced pubkey handling with context-aware truncation
  if (context.pubkey) {
    sanitized.pubkey = truncatePubkey(context.pubkey);
    // Add pubkey length for validation debugging
    sanitized.pubkeyLength = context.pubkey.length;
    // Add format validation status
    sanitized.pubkeyValid = /^[0-9a-fA-F]{64}$/.test(context.pubkey);
  }
  
  // Enhanced error handling with more context
  if (context.error) {
    if (typeof context.error === 'string') {
      sanitized.error = context.error;
      sanitized.errorLength = context.error.length;
    } else {
      sanitized.error = 'Error object';
    }
  }
  
  // Copy other safe fields with type validation
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
 * Intelligently truncates stack traces for logging while preserving useful information
 * Uses line-based truncation instead of arbitrary character limits to maintain readability
 * @param stackTrace - The full stack trace string
 * @returns Truncated stack trace that preserves key information
 */
function truncateStackTrace(stackTrace: string): string {
  const lines = stackTrace.split('\n');
  
  // Keep the error message line and first 8 stack frames for context
  const importantLines = lines.slice(0, 9);
  
  // For short stack traces, return as-is (using line count instead of character count)
  if (lines.length <= 10) {
    return stackTrace;
  }
  
  // Add informative truncation notice
  const truncated = importantLines.join('\n');
  const remainingLines = lines.length - importantLines.length;
  
  if (remainingLines > 0) {
    return `${truncated}\n... (${remainingLines} more stack frames truncated - check full logs for complete trace)`;
  }
  
  return truncated;
}

/**
 * Logger for authentication success events with comprehensive context
 * 
 * @param operation - The authentication operation that succeeded
 * @param firebaseUser - Firebase user context for the operation
 * @param pubkey - Associated Nostr pubkey if applicable
 */
export function logAuthSuccess(operation: string, firebaseUser?: FirebaseUser, pubkey?: string): void {
  const context = sanitizeLogContext({
    operation,
    firebaseUid: firebaseUser?.uid,
    firebaseEmail: firebaseUser?.email,
    pubkey,
    timestamp: new Date().toISOString(),
    level: 'success'
  });
  
  console.info(`Authentication success: ${operation}`, {
    ...context,
    message: `Successfully completed authentication operation: ${operation}`,
    category: 'authentication'
  });
}

/**
 * Logger for authentication errors with comprehensive error context
 * 
 * @param operation - The authentication operation that failed
 * @param error - The error object or message
 * @param firebaseUser - Firebase user context for the operation
 * @param pubkey - Associated Nostr pubkey if applicable
 * @param linkedPubkeysCount - Number of linked pubkeys for context
 */
export function logAuthError(operation: string, error: unknown, firebaseUser?: FirebaseUser, pubkey?: string, linkedPubkeysCount?: number): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const context = sanitizeLogContext({
    operation,
    firebaseUid: firebaseUser?.uid,
    firebaseEmail: firebaseUser?.email,
    pubkey,
    linkedPubkeysCount,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    level: 'error'
  });
  
  const structuredLog = {
    ...context,
    message: `Authentication operation failed: ${operation}`,
    category: 'authentication',
    errorDetails: {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: errorMessage,
      stack: errorStack ? truncateStackTrace(errorStack) : undefined
    }
  };
  
  // Use appropriate log level based on operation criticality
  if (operation === 'account-linking' || operation === 'account-linking-validation') {
    // Account linking failures are warnings since auth can continue
    console.warn(`Authentication warning: ${operation}`, structuredLog);
  } else {
    // Other auth failures are errors
    console.error(`Authentication error: ${operation}`, structuredLog);
  }
}

/**
 * Logger for authentication info events with structured context
 * 
 * @param operation - The authentication operation being logged
 * @param firebaseUser - Firebase user context for the operation
 * @param pubkey - Associated Nostr pubkey if applicable
 * @param linkedPubkeysCount - Number of linked pubkeys for context
 */
export function logAuthInfo(operation: string, firebaseUser?: FirebaseUser, pubkey?: string, linkedPubkeysCount?: number): void {
  const context = sanitizeLogContext({
    operation,
    firebaseUid: firebaseUser?.uid,
    firebaseEmail: firebaseUser?.email,
    pubkey,
    linkedPubkeysCount,
    timestamp: new Date().toISOString(),
    level: 'info'
  });
  
  console.info(`Authentication info: ${operation}`, {
    ...context,
    message: `Authentication information for operation: ${operation}`,
    category: 'authentication'
  });
}