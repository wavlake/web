/**
 * Utility functions for handling Nostr pubkey formatting and display
 */

import type { NostrProfile } from "@/types/auth";

// Cached regex pattern for pubkey validation to improve performance
const PUBKEY_REGEX = /^[0-9a-fA-F]{64}$/;

// Constants for consistent string literals
const INVALID_PUBKEY_DISPLAY = 'invalid-pubkey';
const UNNAMED_ACCOUNT_DISPLAY = 'Unnamed Account';

/**
 * Truncates a pubkey for safe display in logs and UI
 * @param pubkey - The full pubkey string
 * @param startChars - Number of characters to show at the start (default: 8)
 * @param endChars - Number of characters to show at the end (default: 8)
 * @returns Truncated pubkey string or 'invalid-pubkey' if input is invalid
 */
export function truncatePubkey(pubkey: string | null | undefined, startChars: number = 8, endChars: number = 8): string {
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length < startChars + endChars) {
    return INVALID_PUBKEY_DISPLAY;
  }
  
  // Validate pubkey format for security
  if (!isValidPubkey(pubkey)) {
    return INVALID_PUBKEY_DISPLAY;
  }
  
  return `${pubkey.slice(0, startChars)}...${pubkey.slice(-endChars)}`;
}

/**
 * Validates if a string is a valid Nostr pubkey format (32-byte hex encoded public key)
 * @param pubkey - The pubkey string to validate
 * @returns true if valid pubkey format (64 character hex string), false otherwise
 */
export function isValidPubkey(pubkey: string | null | undefined): boolean {
  if (!pubkey || typeof pubkey !== 'string') {
    return false;
  }
  
  // Basic validation: should be 64 character hex string (32 bytes in hex)
  return PUBKEY_REGEX.test(pubkey);
}

/**
 * Profile interface for display name extraction (legacy support)
 */
export interface ProfileWithName {
  name?: string;
  display_name?: string;
}

/**
 * Sanitizes a name field for safe display, removing potentially dangerous characters
 * @param name - The name string to sanitize
 * @returns Sanitized name string
 */
function sanitizeName(name: string): string {
  // Remove potentially dangerous characters without control character regex
  return name
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep only printable ASCII and Unicode characters
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Safely extracts display name from profile data, preferring 'name' over 'display_name'
 * @param profile - The profile object containing optional name fields
 * @returns name > display_name > 'Unnamed Account'
 */
export function getDisplayName(profile?: NostrProfile | ProfileWithName | null): string {
  if (!profile) {
    return UNNAMED_ACCOUNT_DISPLAY;
  }

  // Get name with trimming for NostrProfile types
  const name = profile.name?.trim?.() || profile.name;
  const displayName = profile.display_name?.trim?.() || profile.display_name;
  
  if (name && typeof name === 'string') {
    const sanitizedName = sanitizeName(name);
    if (sanitizedName) return sanitizedName;
  }
  
  if (displayName && typeof displayName === 'string') {
    const sanitizedDisplayName = sanitizeName(displayName);
    if (sanitizedDisplayName) return sanitizedDisplayName;
  }
  
  return UNNAMED_ACCOUNT_DISPLAY;
}