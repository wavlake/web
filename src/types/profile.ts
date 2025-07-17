/**
 * Profile Data Types
 * 
 * Shared types for user profile data across the authentication system.
 */

/**
 * Profile data interface for Nostr kind:0 metadata events
 * Based on NIP-01 specification for user metadata
 */
export interface ProfileData {
  /** The user's primary name/username */
  name?: string;
  
  /** Display name for showing in UI (can be different from name) */
  display_name?: string;
  
  /** User's bio/about text */
  about?: string;
  
  /** Profile picture URL */
  picture?: string;
  
  /** Banner/header image URL */
  banner?: string;
  
  /** NIP-05 verification identifier (like DNS for Nostr) */
  nip05?: string;
  
  /** Lightning address for receiving payments */
  lud16?: string;
  
  /** Personal website URL */
  website?: string;
}