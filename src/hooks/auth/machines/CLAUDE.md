# Authentication State Machine Flows - Complete Reference

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
type SignupStep = "user-type" | "artist-type" | "profile-setup" | "firebase-backup" | "complete";

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
Complex migration for users with existing Firebase accounts, with optional Nostr account linking.

### State Machine Definition
```typescript
type LegacyMigrationStep = 
  | "firebase-auth" 
  | "checking-links" 
  | "linked-nostr-auth" 
  | "account-choice" 
  | "account-generation" 
  | "bring-own-keypair" 
  | "profile-setup"     // deprecated
  | "linking"           // deprecated
  | "complete";

interface LegacyMigrationState {
  step: LegacyMigrationStep;
  firebaseUser: FirebaseUser | null;
  linkedPubkeys: string[] | null;
  createdLogin: NLoginType | null;
  generatedName: string | null;
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
   - **Response:** `{ linked_pubkeys: [{ pubkey: string, linked_at: string }] }`

2. **State Logic & Navigation:**
   - **If pubkeys found:** Store pubkeys, → `linked-nostr-auth`
   - **If no pubkeys:** → `account-choice`

#### Step 3: Linked Nostr Auth (`linked-nostr-auth`) - If Links Found
**User Action:** Authenticate with expected Nostr account using extension/nsec/bunker  
**Trigger:** `handleLinkedNostrAuthentication(credentials: NostrCredentials)`  
**State Machine Action:** `authenticateWithLinkedNostr`

**Operations:**
1. **Nostr Authentication:**
   - **Methods:** Same as Nostr Login Flow (extension/nsec/bunker)
   - **Additional Validation:** Confirms pubkey matches expected linked account

2. **Account Verification:**
   - **Check:** Authenticated pubkey must be in `state.linkedPubkeys`
   - **Error:** If mismatch, show error and remain on step

3. **Navigation:** Direct → `complete` (linking already exists)

#### Step 4: Account Choice (`account-choice`) - If No Links Found
**User Action:** Click "Generate New Account" or "Import Existing Keys"  
**Trigger:** UI dispatches choice-specific action  
**State Machine Action:** Choice flag update

**Operations:**
- **State Update Only:** Sets choice flag
- **Navigation:**
  - Generate → `account-generation`
  - Import → `bring-own-keypair`

#### Step 5: Account Generation (`account-generation`)
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
     - NIP-98 signed authentication header
   - **Data:** `{ pubkey: login.pubkey, firebaseUid: firebaseUser.uid }`

3. **Navigation:** Direct → `complete` (skips deprecated profile-setup and linking steps)

#### Step 6: Bring Own Keypair (`bring-own-keypair`)
**User Action:** Enter nsec/bunker URI and submit  
**Trigger:** `handleBringOwnKeypairWithCredentials(credentials: NostrCredentials)`  
**State Machine Action:** `bringOwnKeypair`

**Operations:**
1. **Nostr Authentication:**
   - **Methods:** Same as Nostr Login Flow (nsec/bunker typically)
   - **Validation:** Ensures provided credentials work

2. **Atomic Firebase Linking:**
   - **Firebase Token:** `await state.firebaseUser.getIdToken()`
   - **HTTP Call:** `POST /auth/link-pubkey`
   - **Headers:**
     - `Authorization: Bearer ${firebaseToken}`
     - NIP-98 signed authentication header  
   - **Data:** `{ pubkey: authenticatedLogin.pubkey, firebaseUid: firebaseUser.uid }`

3. **Navigation:** Direct → `complete` (skips deprecated steps)

#### Step 7: Profile Setup (`profile-setup`) - DEPRECATED
**Status:** This step is now skipped due to atomic linking implementation
**Reason:** Profile setup moved to complete step to reduce user friction

#### Step 8: Linking (`linking`) - DEPRECATED
**Status:** This step is now skipped due to atomic linking implementation  
**Reason:** Linking now happens atomically during account generation/import

#### Step 9: Complete (`complete`)
**User Action:** Click continue or automatic after linking  
**Trigger:** `handleMigrationCompletion()`  
**State Machine Action:** `completeLogin`

**Operations:**
1. **Login Process** (if generated account):
   - **Operation:** `addLogin(state.createdLogin)`
   - **Effect:** Makes user authenticated with Nostr

2. **Account Setup:**
   - **Cashu Wallet Creation:**
     - **HTTP Calls:** Multiple requests to Cashu mint endpoints
     - **Data:** Generated private key, mint URLs
     - **Purpose:** Create NIP-60 wallet for payments
   
   - **Profile Publishing:**
     - **Nostr Operation:** `publishEvent({ kind: 0, content: JSON.stringify({ name: generatedName }) })`
     - **Data:** Uses generated name (no custom profile data in migration)
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
// Account Linking
POST /auth/link-pubkey
Headers: {
  "Authorization": "Bearer ${firebaseToken}",
  "Nostr-Signature": NIP-98 signed auth header
}
Body: { pubkey: string, firebaseUid: string }

// Link Retrieval
GET /auth/get-linked-pubkeys  
Headers: { "Authorization": "Bearer ${firebaseToken}" }
Response: { linked_pubkeys: [{ pubkey: string, linked_at: string }] }
```

### Cashu Mint Calls
```typescript
// Wallet Creation (multiple endpoints)
// Specific endpoints vary by mint configuration
// Used during account setup in all flows
```

## Nostr Protocol Operations

### Key Generation & Management
```typescript
generateSecretKey(): Uint8Array
nip19.nsecEncode(secretKey): string
nip19.npubEncode(publicKey): string
```

### Login Creation
```typescript
NLogin.fromNsec(nsec): NLoginType
NLogin.fromExtension(): NLoginType  
NLogin.fromBunker(uri, nostr): NLoginType
```

### Event Publishing
```typescript
// Profile Events (Kind 0)
publishEvent({
  kind: 0,
  content: JSON.stringify(profileData),
}): Promise<void>
```

### Authentication Headers
```typescript
// NIP-98 HTTP Auth
headers: {
  "Authorization": `Nostr ${base64(signedEvent)}`
}
```

## State Machine Architecture Patterns

### Atomic Operations
- **Firebase linking happens immediately** after account creation
- **Prevents orphaned accounts** that exist in one system but not the other
- **Single transaction model** for account creation + linking

### Error Handling
- **Failed operations maintain state** - user can retry without losing progress
- **Granular error messages** - specific feedback for each failure type
- **Graceful degradation** - non-critical operations (like wallet creation) don't block flow

### Navigation Patterns
- **Bidirectional navigation** with `canGoBack` flag
- **Step validation** - can't advance without completing current step
- **Conditional routing** - different paths based on user type and choices

### Async Action Pattern
```typescript
// All async operations follow this pattern:
const asyncAction = createAsyncAction("actionName", async (...args) => {
  // 1. Perform operations
  const result = await someOperation();
  
  // 2. Update state
  dispatch({ type: "SUCCESS", payload: result });
  
  // 3. Return result
  return result;
}, dispatch);
```

### Loading & Error States
- **Per-operation loading states** - `isLoading("operationName")`
- **Per-operation error storage** - `getError("operationName")`
- **Automatic cleanup** - errors cleared when operations succeed

This architecture ensures reliable, user-friendly authentication flows while maintaining data consistency across Firebase and Nostr systems.