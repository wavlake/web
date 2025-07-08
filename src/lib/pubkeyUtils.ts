/**
 * Utility functions for handling Nostr pubkey formatting and display
 */

import type { NostrProfile } from "@/types/auth";

/**
 * Truncates a pubkey for safe display in logs and UI
 * @param pubkey - The full pubkey string
 * @param startChars - Number of characters to show at the start (default: 8)
 * @param endChars - Number of characters to show at the end (default: 8)
 * @returns Truncated pubkey string or 'invalid-pubkey' if input is invalid
 */
export function truncatePubkey(pubkey: string | null | undefined, startChars: number = 8, endChars: number = 8): string {
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length < startChars + endChars) {
    return 'invalid-pubkey';
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
  return /^[0-9a-fA-F]{64}$/.test(pubkey);
}

/**
 * Validates a pubkey and throws a descriptive error if invalid
 * @param pubkey - The pubkey string to validate
 * @param context - Optional context for error message
 * @throws {Error} If pubkey is null/undefined, not a string, not 64 characters, or contains non-hex characters
 */
export function validatePubkeyOrThrow(pubkey: string | null | undefined, context?: string): asserts pubkey is string {
  if (!pubkey) {
    throw new Error(`Pubkey is required${context ? ` for ${context}` : ''}`);
  }
  
  if (typeof pubkey !== 'string') {
    throw new Error(`Pubkey must be a string${context ? ` for ${context}` : ''}, received: ${typeof pubkey}`);
  }
  
  // Reuse the centralized validation logic to avoid pattern duplication
  if (!isValidPubkey(pubkey)) {
    if (pubkey.length !== 64) {
      throw new Error(`Invalid pubkey length${context ? ` for ${context}` : ''}: expected 64 characters, got ${pubkey.length}`);
    }
    throw new Error(`Invalid pubkey format${context ? ` for ${context}` : ''}: must contain only hexadecimal characters (0-9, a-f, A-F)`);
  }
}

/**
 * Safely extracts display name from profile data, preferring 'name' over 'display_name'
 * @param profile - The profile object containing optional name fields
 * @returns name > display_name > 'Unnamed Account'
 */
export function getDisplayName(profile?: NostrProfile | null): string {
  const name = profile?.name?.trim();
  const displayName = profile?.display_name?.trim();
  return name || displayName || 'Unnamed Account';
}