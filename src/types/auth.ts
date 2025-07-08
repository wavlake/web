/**
 * Type definitions for Nostr authentication and auto-linking functionality.
 * 
 * This module provides comprehensive type safety for the NostrAuthStep component
 * and related authentication hooks, ensuring proper integration between Nostr
 * protocol operations and Firebase account management.
 * 
 * Key features:
 * - Multi-method Nostr authentication (extension, nsec, bunker)
 * - Automatic pubkey linking to Firebase accounts
 * - Secure type definitions for sensitive operations
 * - Integration with existing Firebase authentication system
 */

import type { NostrSigner } from "@jsr/nostrify__types";
import type { NLoginType } from "@nostrify/react/login";

/** Firebase user representation for account linking operations */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  getIdToken: () => Promise<string>;
}

/** Nostr user profile metadata structure */
export interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
}

/** Linked pubkey with optional profile information */
export interface LinkedPubkey {
  pubkey: string;
  profile?: NostrProfile;
}

/** 
 * Result type for auto-linking operations providing detailed success/error information.
 * 
 * Success pattern: { success: true } - auto-linking completed successfully
 * Failure pattern: { success: false, error: Error } - auto-linking failed with detailed error
 * 
 * This design ensures consistent error handling while providing actionable error information
 * for user feedback and debugging purposes.
 */
export interface AutoLinkResult {
  /** Indicates whether the auto-linking operation completed successfully */
  success: boolean;
  /** Success or error message */
  message?: string;
  /** Detailed error information when success is false, undefined when success is true */
  error?: Error;
}

/** Properties for the NostrAuthStep component */
export interface NostrAuthStepProps {
  /** Firebase user for auto-linking operations (required for linking) */
  firebaseUser?: FirebaseUser;
  /** Previously linked pubkeys to prevent conflicts */
  linkedPubkeys?: LinkedPubkey[];
  /** Specific pubkey expected for authentication (optional constraint) */
  expectedPubkey?: string;
  /** Callback fired on successful authentication */
  onSuccess: (login: NLoginType) => void;
  /** Callback for back navigation */
  onBack: () => void;
  /** Enable automatic linking of authenticated pubkeys to Firebase accounts */
  enableAutoLink?: boolean;
}

export type { NostrSigner };