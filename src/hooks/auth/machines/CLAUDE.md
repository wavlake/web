# Authentication State Machine Flows

This document provides a comprehensive analysis of all authentication state machine flows, their steps, and the exact timing of HTTP calls and Nostr relay interactions.

## Overview

The authentication system consists of three main state machine flows:

1. **Signup Flow** - New user registration with profile creation
2. **Nostr Login Flow** - Direct authentication for existing Nostr users
3. **Legacy Migration Flow** - Complex migration from Firebase-only accounts to Nostr-linked accounts

All flows follow a Promise-Based State Machine pattern with:

- Typed states, actions, and asynchronous operations
- Atomic Firebase linking to prevent orphaned accounts
- Error handling with retry capabilities
- Bidirectional navigation with `canGoBack` support

---

## 1. Signup Flow (`useSignupStateMachine`)

### Purpose

Complete onboarding for new users, including user type selection, profile creation, and optional Firebase backup.

### State Machine Definition

```typescript
type SignupStep =
  | "user-type"
  | "artist-type"
  | "profile-setup"
  | "firebase-backup"
  | "complete";

interface SignupState {
  step: SignupStep;
  isArtist: boolean | null;
  isSoloArtist: boolean | null;
  profileData: ProfileData | null;
  createdLogin: NLoginType | null;
  firebaseUser: FirebaseUser | null;
  generatedName: string | null;
  // ... base state properties
}
```

### Complete Flow Analysis

#### Step 1: User Type Selection (`user-type`)

**User Action:** Click "Artist" or "Listener"  
**Trigger:** `handleUserTypeSelection(isArtist: boolean)`  
**State Machine Action:** `setUserType`

**Operations:**

- **State Update:** Sets `isArtist` flag
- **Navigation:**
  - Artist → `artist-type`
  - Listener → `profile-setup`
- **Nostr Account Creation** (if listener):
  - **HTTP Call:** None (local key generation)
  - **Nostr Operation:**
    - `generateSecretKey()` - Create new private key
    - `nip19.nsecEncode(sk)` - Encode as nsec
    - `NLogin.fromNsec(nsec)` - Create login object
  - **Data Returned:** `{ login: NLoginType, generatedName: string }`
  - **State Storage:** Stores login and generated name

**Timing:** Account creation happens immediately for listeners, deferred for artists

#### Step 2: Artist Type Selection (`artist-type`) - Artists Only

**User Action:** Click "Solo Artist" or "Band/Group"  
**Trigger:** `handleArtistTypeSelection(isSolo: boolean)`  
**State Machine Action:** `setArtistType`

**Operations:**

- **State Update:** Sets `isSoloArtist` flag
- **Navigation:** → `profile-setup`
- **Nostr Account Creation:**
  - **HTTP Call:** None (local key generation)
  - **Nostr Operation:** Same as listener creation above
  - **Data Returned:** `{ login: NLoginType, generatedName: string }`
  - **State Storage:** Stores login and generated name

#### Step 3: Profile Setup (`profile-setup`)

**User Action:** Fill profile form (name, image, bio) and submit  
**Trigger:** `handleProfileCompletion(profileData: ProfileData)`  
**State Machine Action:** `completeProfile`

**Operations:**

- **State Update:** Stores `profileData`
- **Navigation:**
  - Artist → `firebase-backup`
  - Listener → `complete`
- **HTTP Call:** None (profile saved to state only)
- **Nostr Operation:** None (profile publishing deferred to complete step)

#### Step 4: Firebase Backup (`firebase-backup`) - Artists Only

**User Actions:**

- Create account: Fill email/password and submit
- Skip: Click skip button

**Create Account Flow:**  
**Trigger:** `handleFirebaseAccountCreation(email, password)`  
**State Machine Action:** `createFirebaseBackup`

**Operations:**

1. **Firebase Account Creation:**

   - **HTTP Call:** `createUserWithEmailAndPassword(auth, email, password)`
   - **Data:** User email, password
   - **Response:** Firebase UserCredential with user object

2. **Optional Profile Update:**

   - **HTTP Call:** `updateProfile(user, { displayName })`
   - **Data:** User's chosen display name

3. **Nostr Login Process:**

   - **Operation:** `addLogin(state.createdLogin)`
   - **Effect:** Logs user into Nostr, makes them active user

4. **Atomic Firebase Linking:**

   - **Firebase Token:** `await firebaseUser.getIdToken()`
   - **HTTP Call:** `POST /auth/link-pubkey`
   - **Headers:**
     - `Authorization: Bearer ${firebaseToken}`
     - NIP-98 signed authentication header
   - **Data:** `{ pubkey: string, firebaseUid: string }`
   - **Response:** Link success confirmation or error

5. **Navigation:** → `complete`

**Skip Flow:**  
**Trigger:** `handleFirebaseBackupSkip()`  
**Operations:**

- **State Update:** Direct transition to `complete`
- **No HTTP/Nostr calls**

#### Step 5: Completion (`complete`)

**User Action:** Click "Get Started" or automatic after Firebase linking  
**Trigger:** `handleSignupCompletion()`  
**State Machine Action:** `completeLogin`

**Operations:**

1. **Nostr Login Process** (if not already done):

   - **Operation:** `addLogin(state.createdLogin)`
   - **Effect:** Logs user into Nostr

2. **Cashu Wallet Creation:**

   - **HTTP Calls:** Multiple requests to Cashu mint endpoints
   - **Data:** Generated private key, mint URLs from config
   - **Purpose:** Create NIP-60 Cashu wallet for payments

3. **Profile Publishing:**
   - **Nostr Operation:** `publishEvent({ kind: 0, content: JSON.stringify(profileData) })`
   - **Data:** Profile name, image, bio from form or generated name
   - **Network:** Publishes to configured Nostr relays

---

## 2. Nostr Login Flow (`useNostrLoginStateMachine`)

### Purpose

Simple authentication for users with existing Nostr credentials.

### State Machine Definition

```typescript
type NostrLoginStep = "auth" | "complete";

interface NostrLoginState {
  step: NostrLoginStep;
  // ... base state properties
}
```

### Complete Flow Analysis

#### Step 1: Authentication (`auth`)

**User Actions:**

- Extension: Click "Sign in with Extension"
- nsec: Enter private key and submit
- Bunker: Enter bunker URI and submit

**Trigger:** `handleNostrAuthentication(method: NostrAuthMethod, credentials: NostrCredentials)`  
**State Machine Action:** `authenticateWithNostr`

**Operations by Authentication Method:**

**Extension Method (`method: "extension"`):**

- **Nostr Operation:** `NLogin.fromExtension()`
- **Browser API:** Calls `window.nostr.getPublicKey()` (NIP-07)
- **Network:** Local extension communication
- **Data Required:** None (extension handles keys)
- **Error Handling:** Extension not available or user rejection

**nsec Method (`method: "nsec"`):**

- **Nostr Operation:** `NLogin.fromNsec(nsec)`
- **Data Required:** `credentials.nsec` - user-provided private key
- **Validation:** Validates nsec format and derives public key
- **Error Handling:** Invalid nsec format or key derivation failure

**Bunker Method (`method: "bunker"`):**

- **Nostr Operation:** `NLogin.fromBunker(uri, nostr)`
- **Network:** WebSocket connection to bunker relay (NIP-46)
- **Data Required:** `credentials.bunkerUri` - connection string with relay and pubkey
- **Protocol:** Establishes remote signer connection
- **Error Handling:** Connection failure or bunker unavailable

**All Methods Continue With:**

1. **Login Process:**

   - **Operation:** `addLogin(login)`
   - **Effect:** Adds to active logins, makes user authenticated

2. **Profile Sync:**

   - **Operation:** `syncProfile()` (dependency)
   - **Status:** Currently placeholder (TODO: implement actual profile syncing)
   - **Future:** Will fetch kind 0 events from relays

3. **Navigation:** → `complete`

#### Step 2: Complete (`complete`)

**Operations:**

- Flow finished, user is authenticated and can access the app
- No additional HTTP calls or Nostr operations

---

## 3. Legacy Migration Flow (`useLegacyMigrationStateMachine`)

### Purpose

Complex migration for users with existing Firebase accounts, with sophisticated pubkey mismatch handling and profile customization.

### State Machine Definition

```typescript
type LegacyMigrationStep =
  | "firebase-auth"
  | "checking-links"
  | "linked-nostr-auth"
  | "pubkey-mismatch" // NEW: Handles pubkey mismatch scenarios
  | "account-choice"
  | "account-generation"
  | "bring-own-keypair"
  | "profile-setup" // ACTIVE: Not deprecated, used for custom profiles
  | "linking" // deprecated
  | "complete";

interface LegacyMigrationState {
  step: LegacyMigrationStep;
  firebaseUser: FirebaseUser | null;
  linkedPubkeys: LinkedPubkey[];
  expectedPubkey: string | null;
  actualPubkey: string | null; // NEW: Actual authenticated pubkey
  mismatchedAccount: NostrAccount | null; // NEW: Mismatched account data
  generatedAccount: NostrAccount | null; // NEW: Generated account data
  createdLogin: NLoginType | null;
  generatedName: string | null;
  profileData: ProfileData | null;
  // ... base state properties
}
```

### Complete Flow Analysis

#### Step 1: Firebase Authentication (`firebase-auth`)

**User Action:** Enter email/password and submit  
**Trigger:** `handleFirebaseAuthentication(email: string, password: string)`  
**State Machine Action:** `authenticateWithFirebase`

**Operations:**

1. **Firebase Authentication:**

   - **HTTP Call:** `signInWithEmailAndPassword(auth, email, password)`
   - **Data:** User email and password
   - **Response:** Firebase UserCredential object
   - **Error Handling:** Invalid credentials, account not found

2. **Firebase Token Generation:**

   - **Operation:** `await firebaseUser.getIdToken()`
   - **Purpose:** Prepare for subsequent API calls

3. **Navigation:** → `checking-links`

#### Step 2: Checking Links (`checking-links`)

**Trigger:** Automatic after Firebase authentication  
**State Machine Action:** `checkLinkedAccounts`

**Operations:**

1. **Fetch Linked Accounts:**

   - **HTTP Call:** `GET /auth/get-linked-pubkeys`
   - **Headers:** `Authorization: Bearer ${firebaseToken}`
   - **Response:** `{ linked_pubkeys: [{ pubkey: string, linked_at: string, isMostRecentlyLinked: boolean }] }`

2. **State Logic & Navigation:**
   - **If pubkeys found:** Store pubkeys, → `linked-nostr-auth`
   - **If no pubkeys:** → `account-choice`

#### Step 3: Linked Nostr Auth (`linked-nostr-auth`) - If Links Found

**User Action:** Authenticate with expected Nostr account using extension/nsec/bunker  
**Trigger:** `handleLinkedNostrAuthentication(credentials: NostrCredentials)`  
**State Machine Action:** `authenticateWithLinkedNostr`

**Operations:**

1. **Nostr Authentication:**

   - **Methods:** Extension/nsec/bunker authentication via `authenticateNostrDependency`
   - **Enhanced Processing:** Converts NLoginType to NostrAccount with proper signer

2. **Pubkey Validation - NEW:**
   - **Check:** Authenticated pubkey must match `state.expectedPubkey`
   - **If Match:** Direct → `complete` (linking already exists)
   - **If Mismatch:** → `pubkey-mismatch` step with account data

#### Step 3a: Pubkey Mismatch (`pubkey-mismatch`) - NEW STEP

**Trigger:** User authenticated with different pubkey than expected  
**Actions Available:**

- **Retry:** `handlePubkeyMismatchRetry()` → back to `linked-nostr-auth`
- **Continue:** `handlePubkeyMismatchContinue()` → link new pubkey

**Continue Operations:**

1. **Account Linking:**

   - **HTTP Call:** `POST /auth/link-pubkey` with dual authentication
   - **Headers:** Firebase token + NIP-98 signature from mismatched account
   - **Data:** `{ pubkey: mismatchedAccount.pubkey, firebaseUid: firebaseUser.uid }`

2. **Error Handling:**

   - Network errors: "Please check connection and try again"
   - Auth errors: "Please try signing in again"
   - Duplicate errors: "Account already linked to different Firebase account"

3. **Navigation:** → `complete`

#### Step 4: Account Choice (`account-choice`) - If No Links Found

**User Action:** Click "Generate New Account" or "Import Existing Keys"  
**Trigger:** UI dispatches choice-specific action  
**State Machine Action:** Choice flag update

**Operations:**

- **State Update Only:** Sets choice flag
- **Navigation:**
  - Generate → `account-generation`
  - Import → `bring-own-keypair`

#### Step 5a: Account Generation (`account-generation`)

**User Action:** Automatic or click continue  
**Trigger:** `handleAccountGeneration()`  
**State Machine Action:** `generateNewAccount`

**Operations:**

1. **Nostr Account Creation:**

   - **HTTP Call:** None (local key generation)
   - **Nostr Operations:**
     - `generateSecretKey()` - Create new private key
     - `nip19.nsecEncode(sk)` - Encode as nsec
     - `NLogin.fromNsec(nsec)` - Create login object
   - **Data Generated:** `{ login: NLoginType, generatedName: string }`

2. **Atomic Firebase Linking:**

   - **Firebase Token:** `await state.firebaseUser.getIdToken()`
   - **HTTP Call:** `POST /auth/link-pubkey`
   - **Headers:**
     - `Authorization: Bearer ${firebaseToken}`
     - NIP-98 signed authentication header using proper signer conversion
   - **Data:** `{ pubkey: login.pubkey, firebaseUid: firebaseUser.uid }`
   - **Error Handling:** Comprehensive error messages for different failure types

3. **Navigation:** → `profile-setup` (NOT deprecated, allows custom profile editing)

#### Step 5b: Bring Own Keypair (`bring-own-keypair`)

**User Action:** Enter nsec/bunker URI and submit  
**Trigger:** `handleBringOwnKeypairWithCredentials(credentials: NostrCredentials)`  
**State Machine Action:** `bringOwnKeypair`

**Operations:**

1. **Nostr Authentication:**

   - **Methods:** Same as other flows (nsec/bunker/extension)
   - **Enhanced Processing:** Creates NostrAccount with proper signer

2. **Atomic Firebase Linking:**

   - **Firebase Token:** `await state.firebaseUser.getIdToken()`
   - **HTTP Call:** `POST /auth/link-pubkey`
   - **Headers:**
     - `Authorization: Bearer ${firebaseToken}`
     - NIP-98 signed authentication header
   - **Data:** `{ pubkey: authenticatedLogin.pubkey, firebaseUid: firebaseUser.uid }`
   - **Error Handling:** User-friendly error messages

3. **Immediate Account Setup:**
   - **User Login:** `addLogin(login)` - Makes user authenticated
   - **Account Setup:** Wallet creation and profile publishing (non-critical operations)
   - **Navigation:** Direct → `complete` (skips profile setup for imported accounts)

#### Step 6: Profile Setup (`profile-setup`) - ACTIVE, NOT DEPRECATED

**User Action:** Fill profile form (name, image, bio) and submit  
**Trigger:** `handleProfileCompletion(profileData: ProfileData)`  
**State Machine Action:** `completeProfile`

**Operations:**

1. **Profile Data Storage:**

   - **State Update:** Stores custom `profileData` from form
   - **Validation:** Ensures `createdLogin` and `generatedName` are available

2. **User Authentication:**

   - **Operation:** `addLogin(state.createdLogin)`
   - **Timing Buffer:** 100ms delay to ensure auth state propagation
   - **Effect:** User becomes authenticated with Nostr

3. **Account Setup with Custom Profile:**

   - **Wallet Creation:** Creates Cashu wallet using authenticated user (timing fix applied)
   - **Profile Publishing:** Publishes custom profile data to Nostr relays
   - **Error Recovery:** Graceful degradation with manual profile publishing fallback

4. **Navigation:** → `complete`

#### Step 7: Linking (`linking`) - DEPRECATED

**Status:** This step is now skipped due to atomic linking implementation  
**Reason:** Linking now happens atomically during account generation/import

#### Step 8: Complete (`complete`)

**User Action:** Click continue or automatic after profile completion  
**Trigger:** `handleMigrationCompletion()`  
**State Machine Action:** `completeLogin`

**Operations:**

1. **Final Login Process** (if not already done):

   - **Operation:** `addLogin(state.createdLogin)`
   - **Effect:** Makes user authenticated with Nostr

2. **Account Setup** (if not done in profile step):

   - **Cashu Wallet Creation:**

     - **HTTP Calls:** Multiple requests to Cashu mint endpoints
     - **Data:** Generated private key, mint URLs
     - **Purpose:** Create NIP-60 wallet for payments

   - **Profile Publishing:**
     - **Nostr Operation:** `publishEvent({ kind: 0, content: JSON.stringify(profileData || { name: generatedName }) })`
     - **Data:** Uses custom profile data if available, fallback to generated name
     - **Network:** Publishes to configured Nostr relays

---

## HTTP API Integration Points

### Firebase SDK Calls

```typescript
// Authentication
signInWithEmailAndPassword(auth, email, password): Promise<UserCredential>
createUserWithEmailAndPassword(auth, email, password): Promise<UserCredential>
updateProfile(user, { displayName }): Promise<void>

// Token Management
firebaseUser.getIdToken(): Promise<string>
```

### Wavlake API Endpoints

```typescript
// Account Linking (Enhanced with better error handling)
POST /auth/link-pubkey
Headers: {
  "Authorization": "Bearer ${firebaseToken}",
  "Nostr-Signature": NIP-98 signed auth header
}
Body: { pubkey: string, firebaseUid: string }
Response: Success confirmation or detailed error

// Link Retrieval (Enhanced response format)
GET /auth/get-linked-pubkeys
Headers: { "Authorization": "Bearer ${firebaseToken}" }
Response: {
  linked_pubkeys: [{
    pubkey: string,
    linked_at: string,
    isMostRecentlyLinked: boolean
  }]
}
```

### Cashu Mint Calls

```typescript
// Wallet Creation (multiple endpoints)
// Specific endpoints vary by mint configuration
// Used during account setup in all flows
// Now with improved error handling and timing
```

## Nostr Protocol Operations

### Key Generation & Management

```typescript
generateSecretKey(): Uint8Array
nip19.nsecEncode(secretKey): string
nip19.npubEncode(publicKey): string
```

### Login Creation (Enhanced)

```typescript
NLogin.fromNsec(nsec): NLoginType
NLogin.fromExtension(): NLoginType
NLogin.fromBunker(uri, nostr): NLoginType

// NEW: Enhanced conversion to NostrAccount with proper signers
const { NUser } = await import("@nostrify/react/login");
const user = NUser.fromNsecLogin(login); // or fromExtensionLogin, fromBunkerLogin
const account: NostrAccount = {
  pubkey: login.pubkey,
  privateKey: login.type === 'nsec' ? login.nsec : undefined,
  signer: user.signer,
  profile: undefined
};
```

### Event Publishing

```typescript
// Profile Events (Kind 0) - Enhanced with custom data
publishEvent({
  kind: 0,
  content: JSON.stringify(profileData),
}): Promise<void>
```

### Authentication Headers (Enhanced)

```typescript
// NIP-98 HTTP Auth with proper signer conversion
const nip98Signer = {
  signEvent: async (event: unknown) => {
    const { NUser } = await import("@nostrify/react/login");
    const user = NUser.fromNsecLogin(login); // proper conversion
    return await user.signer.signEvent(event as any);
  },
  getPublicKey: async () => login.pubkey,
};
```

## State Machine Architecture Patterns

### Atomic Operations (Enhanced)

- **Firebase linking happens immediately** after account creation
- **Prevents orphaned accounts** that exist in one system but not the other
- **Single transaction model** for account creation + linking
- **Enhanced error recovery** with user-friendly messages and graceful degradation

### Error Handling (Comprehensive Update)

- **Failed operations maintain state** - user can retry without losing progress
- **Granular error messages** - specific feedback for each failure type
- **Graceful degradation** - non-critical operations (like wallet creation) don't block flow
- **Error categorization**: Network, authentication, duplicate account errors
- **Fallback mechanisms**: Manual profile publishing if main setup fails

### Navigation Patterns (Enhanced)

- **Bidirectional navigation** with `canGoBack` flag
- **Step validation** - can't advance without completing current step
- **Conditional routing** - different paths based on user type and choices
- **NEW: Pubkey mismatch handling** - sophisticated retry/continue options

### Async Action Pattern

```typescript
// All async operations follow this enhanced pattern:
const asyncAction = createAsyncAction(
  "actionName",
  async (...args) => {
    console.log(`🔄 [LegacyMigration] Starting ${actionName}:`, {
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Perform operations with proper error handling
      const result = await someOperation();

      // 2. Update state
      dispatch({ type: "SUCCESS", payload: result });

      console.log(`✅ [LegacyMigration] ${actionName} completed:`, {
        timestamp: new Date().toISOString(),
      });

      // 3. Return result
      return result;
    } catch (error: any) {
      console.log(`❌ [LegacyMigration] ${actionName} failed:`, {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Enhanced error message generation
      if (error.message?.includes("network")) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      }
      // ... other error categorizations

      throw error;
    }
  },
  dispatch
);
```

### Loading & Error States (Enhanced)

- **Per-operation loading states** - `isLoading("operationName")`
- **Per-operation error storage** - `getError("operationName")`
- **Automatic cleanup** - errors cleared when operations succeed
- **Enhanced logging** - comprehensive audit trail with timestamps
- **Timing considerations** - authentication state propagation delays handled

## Key Updates Summary

### NEW Features:

1. **Pubkey Mismatch Handling**: Complete flow for handling authentication mismatches
2. **Enhanced Error Recovery**: Comprehensive error categorization and user-friendly messages
3. **Profile Customization**: Profile setup is active (not deprecated) for generated accounts
4. **Timing Fixes**: Authentication state propagation delays handled
5. **Graceful Degradation**: Non-critical operations don't block authentication
6. **Enhanced Logging**: Comprehensive audit trail for debugging

### CORRECTED Documentation:

1. **Profile Setup Status**: Active for account generation, not deprecated
2. **State Fields**: Added missing `actualPubkey`, `mismatchedAccount`, `generatedAccount`
3. **Flow Routing**: Account generation goes to profile-setup, not directly to complete
4. **Error Handling**: Detailed error scenarios and recovery mechanisms
5. **Signer Conversion**: Proper NLoginType to NostrAccount conversion with working signers

This architecture ensures reliable, user-friendly authentication flows while maintaining data consistency across Firebase and Nostr systems with sophisticated error recovery and user experience optimization.
