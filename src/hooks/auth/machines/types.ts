/**
 * State Machine Types for Auth Refactor
 * 
 * Base interfaces and types for the Promise-Based State Machine pattern
 * used across all authentication flows.
 */

// Base interfaces that all state machines extend
export interface BaseStateMachineState {
  step: string;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
  canGoBack: boolean;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type AsyncActionHandler<TArgs extends unknown[] = unknown[], TResult = unknown> = 
  (...args: TArgs) => Promise<ActionResult<TResult>>;

// Base action types that all state machines use
export interface BaseStateMachineAction {
  type: string;
}

export interface AsyncStartAction extends BaseStateMachineAction {
  type: "ASYNC_START";
  operation: string;
}

export interface AsyncSuccessAction<T = unknown> extends BaseStateMachineAction {
  type: "ASYNC_SUCCESS";
  operation: string;
  data?: T;
}

export interface AsyncErrorAction extends BaseStateMachineAction {
  type: "ASYNC_ERROR";
  operation: string;
  error: string;
}

export interface ResetAction extends BaseStateMachineAction {
  type: "RESET";
}

export interface GoBackAction extends BaseStateMachineAction {
  type: "GO_BACK";
}

// Signup State Machine Types
export type SignupStep = 
  | "user-type"
  | "artist-type"  
  | "profile-setup"
  | "firebase-backup"
  | "complete";

export interface SignupState extends BaseStateMachineState {
  step: SignupStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  account: NostrAccount | null;
}

export type SignupAction = 
  | { type: "SET_USER_TYPE"; isArtist: boolean }
  | { type: "SET_ARTIST_TYPE"; isSolo: boolean }
  | { type: "PROFILE_COMPLETED" }
  | { type: "FIREBASE_BACKUP_COMPLETED" }
  | AsyncStartAction
  | AsyncSuccessAction
  | AsyncErrorAction
  | GoBackAction
  | ResetAction;

// Nostr Login State Machine Types
export type NostrLoginStep = 
  | "auth"
  | "complete";

export interface NostrLoginState extends BaseStateMachineState {
  step: NostrLoginStep;
}

export type NostrLoginAction = 
  | { type: "AUTH_COMPLETED" }
  | AsyncStartAction
  | AsyncSuccessAction
  | AsyncErrorAction
  | ResetAction;

// Legacy Migration State Machine Types
export type LegacyMigrationStep = 
  | "firebase-auth"
  | "checking-links"
  | "linked-nostr-auth"
  | "account-choice"
  | "account-generation"
  | "bring-own-keypair"
  | "linking"
  | "complete";

export interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
  };
  isPrimary?: boolean;
  linkedAt?: number;
  isMostRecentlyLinked?: boolean;
}

// Nostr signer interface
export interface NostrSigner {
  getPublicKey(): Promise<string>;
  signEvent(event: {
    kind: number;
    content: string;
    tags: string[][];
    created_at: number;
  }): Promise<{
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
  }>;
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

// Firebase user interface (simplified)
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface NostrAccount {
  pubkey: string;
  privateKey?: string;
  signer?: NostrSigner;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

export interface LegacyMigrationState extends BaseStateMachineState {
  step: LegacyMigrationStep;
  firebaseUser: FirebaseUser | null;
  linkedPubkeys: LinkedPubkey[];
  expectedPubkey: string | null;
  generatedAccount: NostrAccount | null;
}

export type LegacyMigrationAction = 
  | { type: "FIREBASE_AUTH_COMPLETED"; firebaseUser: FirebaseUser }
  | { type: "LINKS_CHECKED"; linkedPubkeys: LinkedPubkey[] }
  | { type: "ACCOUNT_CHOICE_MADE"; choice: "generate" | "bring-own" }
  | { type: "ACCOUNT_GENERATED"; account: NostrAccount }
  | { type: "KEYPAIR_AUTHENTICATED"; account: NostrAccount }
  | { type: "LINKING_COMPLETED" }
  | AsyncStartAction
  | AsyncSuccessAction
  | AsyncErrorAction
  | GoBackAction
  | ResetAction;