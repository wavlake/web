/**
 * Authentication-related type definitions for NostrAuthStep component
 */

import type { NostrSigner } from "@jsr/nostrify__types";
import type { NLoginType } from "@nostrify/react/login";

export interface FirebaseUser {
  uid: string;
  getIdToken: () => Promise<string>;
}

export interface NostrProfile {
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
}

export interface LinkedPubkey {
  pubkey: string;
  profile?: NostrProfile;
}

export interface AutoLinkResult {
  success: boolean;
  error?: Error;
}

export interface NostrAuthStepProps {
  firebaseUser?: FirebaseUser;
  linkedPubkeys?: LinkedPubkey[];
  expectedPubkey?: string;
  onSuccess: (login: NLoginType) => void;
  onBack: () => void;
  enableAutoLink?: boolean;
}

// Re-export the NostrSigner type from nostrify for convenience
export type { NostrSigner };