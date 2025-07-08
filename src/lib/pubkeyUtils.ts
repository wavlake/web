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
 * Safely extracts display name from profile data, preferring 'name' over 'display_name'
 * @param profile - The profile object containing optional name fields
 * @returns name > display_name > 'Unnamed Account'
 */
export function getDisplayName(profile?: NostrProfile | null): string {
  const name = profile?.name?.trim();
  const displayName = profile?.display_name?.trim();
  return name || displayName || 'Unnamed Account';
}