/**
 * Shared Authentication Type Interfaces
 * 
 * Composable dependency interfaces for authentication state machines.
 * These interfaces enable code reuse and consistent patterns across all auth flows.
 */

import type { ProfileData } from "@/types/profile";
import type { User } from "firebase/auth";
import type { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";

// Re-export commonly used types for convenience
export type { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
export type { ProfileData } from "@/types/profile";

/**
 * Base dependencies required by all authentication state machines
 */
export interface BaseAuthDependencies {
  /**
   * Adds a login session to the current user context
   * Makes the user authenticated and available throughout the app
   */
  addLogin: (login: import("@nostrify/react/login").NLoginType) => void;
}

/**
 * Nostr authentication capabilities
 * Used by state machines that handle Nostr login flows
 */
export interface NostrAuthDependencies {
  /**
   * Authenticate using various Nostr methods (extension, nsec, bunker)
   * Returns authentication result with user credentials
   */
  authenticate: (
    method: NostrAuthMethod, 
    credentials: NostrCredentials
  ) => Promise<unknown>;
}

/**
 * Enhanced Nostr authentication for state machines requiring NostrAccount objects
 * Used by complex flows that need account linking and profile management
 */
export interface EnhancedNostrAuthDependencies {
  /**
   * Authenticate and return a structured NostrAccount object
   * Includes pubkey, signer, and profile information
   */
  authenticateNostr: (
    method: NostrAuthMethod,
    credentials: NostrCredentials
  ) => Promise<{
    pubkey: string;
    signer: {
      signEvent: (event: unknown) => Promise<unknown>;
      getPublicKey?: () => Promise<string>;
    };
    profile?: {
      name?: string;
      display_name?: string;
      picture?: string;
      about?: string;
    };
  }>;
}

/**
 * Account creation and setup capabilities
 * Used by flows that create new Nostr accounts
 */
export interface AccountCreationDependencies {
  /**
   * Create a new Nostr account with generated keys
   * Returns login object and generated display name
   */
  createAccount: () => Promise<{
    login: import("@nostrify/react/login").NLoginType;
    generatedName: string;
  }>;

  /**
   * Setup a created account with profile and wallet
   * Publishes kind 0 profile events and creates Cashu wallet
   */
  setupAccount: (
    profileData: ProfileData | null,
    generatedName: string
  ) => Promise<void>;
}

/**
 * Firebase authentication and integration capabilities  
 * Used by flows that require Firebase account linking
 */
export interface FirebaseAuthDependencies {
  /**
   * Authenticate with Firebase using email/password
   * Returns Firebase user object for subsequent operations
   */
  firebaseAuth: (email: string, password: string) => Promise<{
    uid: string;
    email: string | null;
    getIdToken: () => Promise<string>;
  }>;

  /**
   * Create a new Firebase account with email/password
   * Used for backup account creation during signup
   */
  createFirebaseAccount?: (email: string, password: string) => Promise<User>;
}

/**
 * Profile management capabilities
 * Used by flows that handle profile data persistence
 */
export interface ProfileManagementDependencies {
  /**
   * Save profile data to storage
   * Used for temporary profile storage during multi-step flows
   */
  saveProfile: (data: ProfileData) => Promise<void>;

  /**
   * Sync profile data from Nostr relays
   * Used to fetch latest profile information
   */
  syncProfile?: () => Promise<void>;
}

/**
 * Nostr protocol integration
 * Required for bunker connections and relay operations
 */
export interface NostrProtocolDependencies {
  /**
   * Nostr instance for relay operations and bunker connections
   * Provides access to protocol-level functionality
   */
  nostr: {
    query: (filters: unknown[], options?: unknown) => Promise<unknown[]>;
    event: (event: unknown) => Promise<unknown>;
    req: (filters: unknown[], options?: unknown) => {
      close: () => void;
    };
  };
}

// =============================================================================
// Composed Interfaces for Specific State Machines
// =============================================================================

/**
 * Dependencies for NostrLogin state machine
 * Simple authentication-only flow
 */
export interface NostrLoginDependencies extends 
  BaseAuthDependencies, 
  NostrAuthDependencies,
  Pick<ProfileManagementDependencies, 'syncProfile'> {
}

/**
 * Dependencies for Signup state machine  
 * Complete account creation with Firebase backup option
 */
export interface SignupDependencies extends
  BaseAuthDependencies,
  AccountCreationDependencies,
  FirebaseAuthDependencies,
  ProfileManagementDependencies {
}

/**
 * Dependencies for LegacyMigration state machine
 * Complex migration with account linking and multiple auth methods
 */
export interface LegacyMigrationDependencies extends
  BaseAuthDependencies,
  EnhancedNostrAuthDependencies,
  AccountCreationDependencies,
  FirebaseAuthDependencies,
  NostrProtocolDependencies {
}

// =============================================================================
// Common Action Result Types
// =============================================================================

/**
 * Standard result type for async authentication actions
 */
export interface AuthActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Authentication result with user information
 */
export interface AuthResult {
  pubkey: string;
  authMethod: NostrAuthMethod;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
  };
}

/**
 * Account creation result
 */
export interface AccountCreationResult {
  login: import("@nostrify/react/login").NLoginType;
  generatedName: string;
  account?: {
    pubkey: string;
    signer: unknown;
    profile?: unknown;
  };
}

/**
 * Firebase authentication result
 */
export interface FirebaseAuthResult {
  firebaseUser: {
    uid: string;
    email: string | null;
    getIdToken: () => Promise<string>;
  };
  linkedPubkeys?: Array<{
    pubkey: string;
    linked_at: string;
    isMostRecentlyLinked?: boolean;
  }>;
}