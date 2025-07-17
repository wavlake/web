/**
 * Authentication Formatting Utilities
 * 
 * Common formatting functions for authentication components
 * to ensure consistent display formats across the application.
 */

import { nip19 } from "nostr-tools";
import { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";

// ============================================================================
// Pubkey Formatting
// ============================================================================

/**
 * Formats a pubkey for display by truncating to show first and last characters
 */
export function formatPubkey(pubkey: string, prefixLength: number = 8, suffixLength: number = 8): string {
  if (!pubkey || typeof pubkey !== "string") {
    return "Unknown";
  }

  const trimmed = pubkey.trim();
  
  if (trimmed.length <= prefixLength + suffixLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, prefixLength)}...${trimmed.slice(-suffixLength)}`;
}

/**
 * Formats a pubkey for display with a shorter format
 */
export function formatPubkeyShort(pubkey: string): string {
  return formatPubkey(pubkey, 6, 6);
}

/**
 * Formats a pubkey for display with a longer format
 */
export function formatPubkeyLong(pubkey: string): string {
  return formatPubkey(pubkey, 16, 16);
}

// ============================================================================
// Npub Formatting
// ============================================================================

/**
 * Converts a hex pubkey to npub format
 */
export function hexToNpub(hexPubkey: string): string {
  try {
    return nip19.npubEncode(hexPubkey);
  } catch (error) {
    return hexPubkey; // Return original if conversion fails
  }
}

/**
 * Converts an npub to hex format
 */
export function npubToHex(npub: string): string {
  try {
    if (npub.startsWith("npub1")) {
      const decoded = nip19.decode(npub);
      if (decoded.type === "npub") {
        return decoded.data as string;
      }
    }
    return npub; // Return original if not npub format
  } catch (error) {
    return npub; // Return original if conversion fails
  }
}

/**
 * Normalizes a pubkey to hex format, handling both hex and npub inputs
 */
export function normalizePubkeyToHex(pubkey: string): string {
  if (!pubkey) return "";
  
  const trimmed = pubkey.trim();
  
  // If it's already hex format
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  
  // If it's npub format, convert to hex
  if (trimmed.startsWith("npub1")) {
    return npubToHex(trimmed);
  }
  
  return trimmed; // Return as-is if unknown format
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Formats a timestamp as a human-readable "time ago" string
 */
export function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) {
    return "Unknown";
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  
  // Convert to different time units
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // Format based on the largest appropriate unit
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else if (weeks > 0) {
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (seconds > 30) {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Formats a timestamp as a short relative time string
 */
export function formatTimeAgoShort(timestamp?: number): string {
  if (!timestamp) {
    return "Unknown";
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// ============================================================================
// Authentication Method Formatting
// ============================================================================

/**
 * Formats authentication method names for display
 */
export function formatAuthMethod(method: string): string {
  switch (method.toLowerCase()) {
    case "extension":
      return "Browser Extension";
    case "nsec":
      return "Private Key";
    case "bunker":
      return "Bunker";
    default:
      return method;
  }
}

/**
 * Gets a description for an authentication method
 */
export function getAuthMethodDescription(method: string): string {
  switch (method.toLowerCase()) {
    case "extension":
      return "Sign in using your browser extension";
    case "nsec":
      return "Sign in using your private key";
    case "bunker":
      return "Sign in using a remote bunker";
    default:
      return "Sign in using this method";
  }
}

// ============================================================================
// Error Message Formatting
// ============================================================================

/**
 * Formats error messages for consistent display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return "An unknown error occurred";
}

/**
 * Creates a user-friendly error message for authentication errors
 */
export function formatAuthErrorMessage(error: unknown, method?: NostrAuthMethod): string {
  const baseMessage = formatErrorMessage(error);
  
  if (method) {
    return `${formatAuthMethod(method)} authentication failed: ${baseMessage}`;
  }
  
  return `Authentication failed: ${baseMessage}`;
}

// ============================================================================
// Credential Formatting
// ============================================================================

/**
 * Formats credentials for display (masking sensitive information)
 */
export function formatCredentialsForDisplay(method: NostrAuthMethod, credentials: NostrCredentials): string {
  switch (method.toLowerCase()) {
    case "extension":
      return "Browser Extension";
    case "nsec":
      return `Private Key (${"nsec" in credentials && credentials.nsec ? "nsec1..." : "Not provided"})`;
    case "bunker":
      return `Bunker (${"bunkerUri" in credentials && credentials.bunkerUri ? "bunker://..." : "Not provided"})`;
    default:
      return method;
  }
}

// ============================================================================
// Validation Message Formatting
// ============================================================================

/**
 * Formats validation messages for consistent display
 */
export function formatValidationMessage(field: string, message: string): string {
  return `${field}: ${message}`;
}

/**
 * Creates a user-friendly validation message
 */
export function createValidationMessage(field: string, isValid: boolean, message?: string): string {
  if (isValid) {
    return `${field} is valid`;
  }
  
  return formatValidationMessage(field, message || "Invalid format");
}

// ============================================================================
// All functions are exported inline above
// ============================================================================