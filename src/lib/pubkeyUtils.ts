/**
 * Utility functions for handling Nostr pubkey formatting and display
 */

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
 * Validates if a string is a valid Nostr pubkey format
 * @param pubkey - The pubkey string to validate
 * @returns true if valid pubkey format, false otherwise
 */
export function isValidPubkey(pubkey: string | null | undefined): boolean {
  if (!pubkey || typeof pubkey !== 'string') {
    return false;
  }
  
  // Enhanced validation: should be exactly 64 character hex string
  if (pubkey.length !== 64) {
    return false;
  }
  
  // Validate hex characters only
  return /^[0-9a-fA-F]{64}$/.test(pubkey);
}

/**
 * Validates a pubkey and throws a descriptive error if invalid
 * @param pubkey - The pubkey string to validate
 * @param context - Optional context for error message
 * @throws {Error} If pubkey format is invalid
 */
export function validatePubkeyOrThrow(pubkey: string | null | undefined, context?: string): asserts pubkey is string {
  if (!pubkey) {
    throw new Error(`Pubkey is required${context ? ` for ${context}` : ''}`);
  }
  
  if (typeof pubkey !== 'string') {
    throw new Error(`Pubkey must be a string${context ? ` for ${context}` : ''}, received: ${typeof pubkey}`);
  }
  
  if (pubkey.length !== 64) {
    throw new Error(`Invalid pubkey length${context ? ` for ${context}` : ''}: expected 64 characters, got ${pubkey.length}`);
  }
  
  if (!/^[0-9a-fA-F]+$/.test(pubkey)) {
    throw new Error(`Invalid pubkey format${context ? ` for ${context}` : ''}: must contain only hexadecimal characters (0-9, a-f, A-F)`);
  }
}

/**
 * Safely extracts display name from profile data
 * @param profile - The profile object
 * @returns Display name or fallback
 */
export function getDisplayName(profile?: { name?: string; display_name?: string } | null): string {
  return profile?.name || profile?.display_name || 'Unnamed Account';
}