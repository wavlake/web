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
  getIdToken: () => Promise<string>;
}

/** Nostr user profile metadata structure */
export interface NostrProfile {
  name?: string;
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
 * Result type for auto-linking operations with detailed success/error information.
 * Success cases return { success: true }, failure cases include error details
 * for proper error handling and user feedback.
 */
export interface AutoLinkResult {
  success: boolean;
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