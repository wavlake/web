/**
 * Authentication Validation Utilities
 * 
 * Common validation logic for authentication components
 * to ensure consistent validation across the application.
 */

import { nip19 } from "nostr-tools";
import { ValidationResult, AuthValidationHelpers } from "../types";

// ============================================================================
// Nsec Validation
// ============================================================================

/**
 * Validates a Nostr secret key (nsec) format and structure
 */
export function validateNsec(nsec: string): ValidationResult {
  if (!nsec || typeof nsec !== "string") {
    return { isValid: false, message: "Nsec is required" };
  }

  const trimmedNsec = nsec.trim();
  
  if (trimmedNsec.length === 0) {
    return { isValid: false, message: "Nsec cannot be empty" };
  }

  if (!trimmedNsec.startsWith("nsec1")) {
    return { isValid: false, message: "Nsec must start with 'nsec1'" };
  }

  try {
    const decoded = nip19.decode(trimmedNsec);
    if (decoded.type !== "nsec") {
      return { isValid: false, message: "Invalid nsec format" };
    }
    
    // Check if the private key is the correct length (32 bytes)
    if (decoded.data && (decoded.data as Uint8Array).length !== 32) {
      return { isValid: false, message: "Invalid private key length" };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      message: "Invalid nsec format or encoding" 
    };
  }
}

// ============================================================================
// Bunker URI Validation
// ============================================================================

/**
 * Validates a NIP-46 bunker URI format
 */
export function validateBunkerUri(uri: string): ValidationResult {
  if (!uri || typeof uri !== "string") {
    return { isValid: false, message: "Bunker URI is required" };
  }

  const trimmedUri = uri.trim();
  
  if (trimmedUri.length === 0) {
    return { isValid: false, message: "Bunker URI cannot be empty" };
  }

  if (!trimmedUri.startsWith("bunker://")) {
    return { isValid: false, message: "Bunker URI must start with 'bunker://'" };
  }

  try {
    const url = new URL(trimmedUri);
    
    // Basic URL validation
    if (url.protocol !== "bunker:") {
      return { isValid: false, message: "Invalid bunker protocol" };
    }
    
    // Check if hostname exists (pubkey or domain)
    if (!url.hostname) {
      return { isValid: false, message: "Bunker URI must include a hostname" };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      message: "Invalid bunker URI format" 
    };
  }
}

// ============================================================================
// Pubkey Validation
// ============================================================================

/**
 * Validates a Nostr public key in hex or npub format
 */
export function validatePubkey(pubkey: string): ValidationResult {
  if (!pubkey || typeof pubkey !== "string") {
    return { isValid: false, message: "Pubkey is required" };
  }

  const trimmedPubkey = pubkey.trim();
  
  if (trimmedPubkey.length === 0) {
    return { isValid: false, message: "Pubkey cannot be empty" };
  }

  // Check if it's in npub format
  if (trimmedPubkey.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(trimmedPubkey);
      if (decoded.type !== "npub") {
        return { isValid: false, message: "Invalid npub format" };
      }
      
      // Check if the public key is the correct length (32 bytes)
      if (decoded.data && (decoded.data as string).length !== 64) {
        return { isValid: false, message: "Invalid public key length" };
      }
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        message: "Invalid npub format or encoding" 
      };
    }
  }

  // Check if it's in hex format (64 characters)
  if (!/^[0-9a-fA-F]{64}$/.test(trimmedPubkey)) {
    return { 
      isValid: false, 
      message: "Pubkey must be 64 character hex string or valid npub" 
    };
  }

  return { isValid: true };
}

// ============================================================================
// Extension Availability Check
// ============================================================================

/**
 * Checks if a Nostr extension is available in the browser
 */
export function isExtensionAvailable(): boolean {
  return typeof window !== "undefined" && "nostr" in window;
}

/**
 * Gets the extension availability status with message
 */
export function getExtensionStatus(): ValidationResult {
  if (!isExtensionAvailable()) {
    return {
      isValid: false,
      message: "Nostr extension not found. Please install a NIP-07 extension."
    };
  }
  
  return { isValid: true };
}

// ============================================================================
// Pubkey Matching Validation
// ============================================================================

/**
 * Validates that two pubkeys match, handling both hex and npub formats
 */
export function validatePubkeyMatch(expectedPubkey: string, actualPubkey: string): ValidationResult {
  if (!expectedPubkey || !actualPubkey) {
    return { isValid: false, message: "Both pubkeys are required for matching" };
  }

  // Normalize both pubkeys to hex format
  const normalizedExpected = normalizePubkey(expectedPubkey);
  const normalizedActual = normalizePubkey(actualPubkey);

  if (!normalizedExpected || !normalizedActual) {
    return { isValid: false, message: "Invalid pubkey format" };
  }

  if (normalizedExpected !== normalizedActual) {
    return { 
      isValid: false, 
      message: "The authenticated account does not match the expected account" 
    };
  }

  return { isValid: true };
}

/**
 * Normalizes a pubkey to hex format (from npub or hex)
 */
function normalizePubkey(pubkey: string): string | null {
  if (!pubkey) return null;
  
  const trimmed = pubkey.trim();
  
  // If it's already hex format
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  
  // If it's npub format, decode it
  if (trimmed.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === "npub") {
        return decoded.data as string;
      }
    } catch (error) {
      return null;
    }
  }
  
  return null;
}

// ============================================================================
// Combined Validation Helpers
// ============================================================================

/**
 * Creates a set of validation helpers for use in components
 */
export function createAuthValidationHelpers(): AuthValidationHelpers {
  return {
    validateNsec,
    validateBunkerUri,
    validatePubkey,
  };
}

// ============================================================================
// All functions are exported inline above
// ============================================================================