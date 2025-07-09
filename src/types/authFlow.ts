/**
 * Type definitions for the new authentication flow system
 * 
 * This file defines all types for the state machine-based auth flow,
 * replacing the scattered state management in the legacy system.
 */

import { type NLoginType } from "@nostrify/react/login";
import { User as FirebaseUser } from "firebase/auth";

// ============================================================================
// Auth Method Types
// ============================================================================

export type NostrAuthMethod = 'extension' | 'nsec' | 'bunker';

export type AuthMethod = 'nostr' | 'firebase' | 'create-account';

// ============================================================================
// User and Account Types  
// ============================================================================

export interface AuthenticatedUser {
  pubkey: string;
  signer: unknown; // From Nostrify
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

export interface LinkedAccount {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
  linkedAt?: number;
  isPrimary?: boolean;
}

export interface LegacyProfile {
  email?: string;
  displayName?: string;
  photoURL?: string;
  // Add other legacy profile fields as needed
}

// ============================================================================
// Auth Flow State Machine Types
// ============================================================================

export type AuthFlowState = 
  | { type: 'method-selection' }
  | { type: 'nostr-auth'; method?: NostrAuthMethod }
  | { type: 'firebase-auth'; mode: 'signin' | 'signup' }
  | { 
      type: 'account-discovery';
      firebaseUser: FirebaseUser;
      isNewUser?: boolean;
    }
  | {
      type: 'account-linking';
      firebaseUser: FirebaseUser;
      selectedPubkey: string;
    }
  | {
      type: 'completed';
      user: AuthenticatedUser;
    }
  | {
      type: 'error';
      error: string;
      previousState?: AuthFlowState;
    };

export type AuthFlowEvent = 
  | { type: 'SELECT_NOSTR' }
  | { type: 'SELECT_FIREBASE' }
  | { type: 'SELECT_CREATE_ACCOUNT' }
  | { type: 'SET_NOSTR_METHOD'; method: NostrAuthMethod }
  | { type: 'SET_FIREBASE_MODE'; mode: 'signin' | 'signup' }
  | { type: 'FIREBASE_SUCCESS'; user: FirebaseUser; isNewUser?: boolean }
  | { type: 'NOSTR_SUCCESS'; login: NLoginType }
  | { type: 'ACCOUNT_SELECTED'; pubkey: string }
  | { type: 'USE_DIFFERENT_ACCOUNT' }
  | { type: 'GENERATE_NEW_ACCOUNT' }
  | { type: 'LINKING_COMPLETE'; user: AuthenticatedUser }
  | { type: 'BACK' }
  | { type: 'RESET' }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' };

// Context passed through auth flow
export interface AuthFlowContext {
  firebaseUser?: FirebaseUser;
  selectedPubkey?: string;
  nostrLogin?: NLoginType;
  linkedAccounts?: LinkedAccount[];
  legacyProfile?: LegacyProfile;
  isNewUser?: boolean;
  error?: string;
}

// ============================================================================
// Hook Result Types
// ============================================================================

export interface AuthFlowResult {
  state: AuthFlowState;
  context: AuthFlowContext;
  send: (event: AuthFlowEvent) => void;
  can: (event: AuthFlowEvent) => boolean;
  isLoading: boolean;
}

export interface NostrAuthResult {
  authenticate: (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<NLoginType>;
  isLoading: boolean;
  error: string | null;
  supportedMethods: NostrAuthMethod[];
  clearError: () => void;
}

export interface FirebaseAuthResult {
  signIn: (email: string, password: string) => Promise<{ user: FirebaseUser; isNewUser: boolean }>;
  signUp: (email: string, password: string) => Promise<{ user: FirebaseUser; isNewUser: boolean }>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export interface AccountDiscoveryResult {
  linkedAccounts: LinkedAccount[];
  legacyProfile: LegacyProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface AccountLinkingResult {
  linkAccount: (firebaseUser: FirebaseUser, pubkey: string) => Promise<void>;
  unlinkAccount: (pubkey: string) => Promise<void>;
  isLinking: boolean;
  error: string | null;
  clearError: () => void;
}

// ============================================================================
// Credential Types
// ============================================================================

export type NostrCredentials = 
  | { method: 'extension' }
  | { method: 'nsec'; nsec: string }
  | { method: 'bunker'; bunkerUri: string };

// ============================================================================
// Error Types
// ============================================================================

export type AuthErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'linking'
  | 'unknown';

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: unknown;
  retryable: boolean;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface NavigationOptions {
  source: 'onboarding' | 'firebase-generation' | 'manual';
  returnPath: string;
  firebaseUserData?: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}