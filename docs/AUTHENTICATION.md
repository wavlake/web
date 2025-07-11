# Wavlake Authentication & Firebase Integration Documentation

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Nostr Authentication System (Primary Layer)](#1-nostr-authentication-system-primary-layer)
- [Firebase Integration System (Optional Sidecar)](#2-firebase-integration-system-optional-sidecar)
- [User Experience Flows](#3-user-experience-flows)
- [Security Architecture](#4-security-architecture)
- [Technical Implementation](#5-technical-implementation)
- [Current State & Analysis](#6-current-state--analysis)
- [File Reference](#7-file-reference)

---

## System Overview

Wavlake implements a **dual authentication architecture** that combines **Nostr as the primary identity layer** with **Firebase as an optional business sidecar**. This design enables pure Nostr-native user experience while providing traditional business features for group owners.

### Core Principles

- **Nostr-first**: Primary identity and authentication mechanism
- **Firebase-optional**: Only required for specific business features
- **Role-based**: Different requirements based on user role
- **Progressive**: Users can start with Nostr-only and add Firebase later

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVLAKE AUTHENTICATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                 ┌──────────────────────┐   │
│  │  NOSTR LAYER    │                 │   FIREBASE LAYER     │   │
│  │  (Primary)      │                 │   (Optional Sidecar) │   │
│  │                 │                 │                      │   │
│  │ • Extension     │                 │ • Email/Password     │   │
│  │ • Nsec          │◄────────────────┤ • Group Owner Only   │   │
│  │ • Bunker        │   Link/Unlink   │ • Business Features  │   │
│  │                 │                 │                      │   │
│  │ Identity Layer  │                 │ Business Layer       │   │
│  └─────────────────┘                 └──────────────────────┘   │
│           │                                     │                │
│           │                                     │                │
│           ▼                                     ▼                │
│  ┌─────────────────┐                 ┌──────────────────────┐   │
│  │   USER ROLES    │                 │    PROTECTED         │   │
│  │                 │                 │    FEATURES          │   │
│  │ • Owner ────────┼─────────────────┤ • Music Uploads      │   │
│  │ • Moderator     │                 │ • Revenue Analytics  │   │
│  │ • Member        │                 │ • Payment Systems    │   │
│  │ • Visitor       │                 │ • Legacy Data        │   │
│  └─────────────────┘                 └──────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Nostr Authentication System (Primary Layer)

### Core Philosophy

- **Nostr-first**: Primary identity and authentication mechanism
- **Self-sovereign**: Users control their private keys
- **Decentralized**: No dependency on centralized services
- **Universal**: Works for all user types (visitors, members, moderators, owners)

### 1.1 Authentication Methods

#### Extension/NIP-07 Authentication

```typescript
// Browser extension integration
const loginInfo = await login.extension();
```

**Features:**

- Most secure method (keys never leave extension)
- Supports Alby, nos2x, Flamingo, and other NIP-07 extensions
- Automatic detection of available extensions
- Seamless signing experience

#### Nsec (Private Key) Authentication

```typescript
// Direct private key input
const loginInfo = await login.nsec(nsecString);
```

**Features:**

- Direct nsec1... string input
- File upload support for key import
- Secure local storage
- Fallback when extensions unavailable

#### Bunker/NIP-46 Authentication

```typescript
// Remote signer connection
const loginInfo = await login.bunker(bunkerUri);
```

**Features:**

- Connects to remote signing services
- Cross-device signing capability
- Support for bunker:// URIs
- Integration with nostr-tools bunker

### 1.2 Session Management

#### Persistence Strategy

```typescript
// Multi-account session storage
localStorage.setItem("nostr:login", JSON.stringify(loginSessions));
```

**Features:**

- **Multi-account support**: Multiple simultaneous logins
- **Automatic recovery**: Sessions persist across browser restarts
- **Secure storage**: Private keys encrypted in browser storage
- **Account switching**: Instant switching between accounts

#### Profile Synchronization

```typescript
// Automatic profile sync to primary relay
const profileSync = useProfileSync();
```

**Process:**

1. Check if kind 0 event exists on `wss://relay.wavlake.com/`
2. Query fallback relays if not found
3. Republish profile to primary relay
4. Handle network failures gracefully

### 1.3 API Authentication (NIP-98)

```typescript
// HTTP authentication using Nostr signatures
const authHeader = await createNip98AuthHeader(url, method, body, user.signer);

fetch(url, {
  headers: { Authorization: authHeader },
});
```

**Security Features:**

- **Request integrity**: Prevents tampering with HTTP requests
- **Non-repudiation**: Cryptographically signed requests
- **Timeout protection**: Automatic request timeouts
- **Replay protection**: Timestamp-based validation

---

## 2. Firebase Integration System (Optional Sidecar)

### Core Philosophy

- **Optional enhancement**: Not required for basic functionality
- **Owner-specific**: Only required for group owners
- **Business-focused**: Enables traditional business features
- **Legacy bridge**: Connects to existing business systems

### 2.1 When Firebase is Required

#### Required For (Owner Role Only):

- **Music uploads & content creation**
- **Revenue analytics and reporting**
- **Payment processing and royalties**
- **Advanced dashboard features**
- **Legacy data access**

#### NOT Required For:

- **Basic dashboard access** (community management)
- **Moderation features** (for moderators)
- **Nostr social features**
- **Profile management**
- **Community participation**

### 2.2 Role-Based Access Control

```typescript
// Role determination logic
const isOwner = event.pubkey === user.pubkey;
const isModerator = event.tags.some(
  (tag) => tag[0] === "p" && tag[1] === user.pubkey && tag[3] === "moderator"
);
```

#### Role Matrix:

| Role          | Nostr Auth  | Firebase Auth   | Dashboard Access | Business Features |
| ------------- | ----------- | --------------- | ---------------- | ----------------- |
| **Owner**     | ✅ Required | ✅ Required     | ✅ Full          | ✅ All Features   |
| **Moderator** | ✅ Required | ❌ Not Required | ✅ Full          | ❌ No Access      |
| **Member**    | ✅ Required | ❌ Not Required | ✅ Limited       | ❌ No Access      |
| **Visitor**   | ❌ Optional | ❌ Not Required | ❌ No Access     | ❌ No Access      |

### 2.3 Account Linking System

#### Linking Process

```typescript
// Dual authentication for linking
const nip98Auth = await createNip98AuthHeader(url, method, body, user.signer);
const firebaseToken = await firebaseUser.getIdToken();

await fetch("/v1/auth/link-pubkey", {
  headers: {
    Authorization: nip98Auth, // Nostr authentication
    "X-Firebase-Token": firebaseToken, // Firebase authentication
  },
});
```

#### Technical Implementation:

1. **Dual Authentication**: Requires both Nostr and Firebase tokens
2. **Server-side Mapping**: Secure association in backend database
3. **One-to-One Relationship**: One Firebase account per Nostr pubkey
4. **Reversible**: Users can unlink accounts at any time

### 2.4 Firebase Owner Guard

```typescript
// Access control component
<FirebaseOwnerGuard>
  <ProtectedOwnerFeature />
</FirebaseOwnerGuard>
```

**Behavior:**

- **Redirect-based**: Automatically redirects to `/link-firebase`
- **Non-blocking**: Doesn't prevent basic dashboard access
- **Role-aware**: Only activates for owners
- **Graceful degradation**: Clear messaging about requirements

---

## 3. User Experience Flows

### 3.1 New User Journey

#### Standard User (Member/Moderator):

```
1. Visit Wavlake → 2. Click "Log in" → 3. Choose Nostr method → 4. Authenticated
                                                                      ↓
5. Access all features (except owner business features) ← Full Dashboard Access
```

#### Group Owner:

```
1. Visit Wavlake → 2. Click "Log in" → 3. Choose Nostr method → 4. Authenticated
                                                                      ↓
5. Access Dashboard → 6. Try Owner Feature → 7. Redirect to /link-firebase
                                                          ↓
8. Link Firebase Account → 9. Full Business Access
```

### 3.2 Account Linking Flow

#### For New Owners:

```
1. Access protected feature → 2. FirebaseOwnerGuard triggers
                                         ↓
3. Redirect to /link-firebase → 4. Educational UI
                                         ↓
5. Firebase authentication → 6. Dual-auth API call → 7. Success
                                         ↓
8. Return to dashboard with full access
```

#### For Account Switching:

```
1. Try to unlink → 2. Detect auth mismatch → 3. Show mismatch warning
                                                      ↓
4. "Switch Account" button → 5. Firebase sign-out → 6. Firebase sign-in
                                                      ↓
7. Proceed with unlink operation
```

### 3.3 Account Management

#### Linking:

- **Entry Points**: Protected feature access, settings page
- **Requirements**: Active Nostr session + Firebase account
- **Process**: Educational UI → Firebase auth → Dual-auth linking
- **Result**: Access to business features

#### Unlinking:

- **Entry Points**: Settings page, account management
- **Requirements**: Both Nostr and Firebase authentication
- **Process**: Confirmation dialog → Dual-auth API call
- **Result**: Loss of business feature access

---

## 4. Security Architecture

### 4.1 Defense in Depth

```
┌─────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CLIENT LAYER                                        │
│     • Private key management                            │
│     • NIP-98 signing                                    │
│     • Session encryption                                │
│                                                         │
│  2. TRANSPORT LAYER                                     │
│     • HTTPS/WSS encryption                              │
│     • CORS policy enforcement                           │
│     • Header validation                                 │
│                                                         │
│  3. API LAYER                                           │
│     • NIP-98 signature verification                     │
│     • Firebase token validation                         │
│     • Dual authentication checks                        │
│                                                         │
│  4. APPLICATION LAYER                                   │
│     • Role-based access control                         │
│     • Resource-level permissions                        │
│     • Business logic validation                         │
│                                                         │
│  5. DATA LAYER                                          │
│     • Secure association storage                        │
│     • Audit logging                                     │
│     • Encrypted sensitive data                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Key Security Features

#### Nostr Security:

- **Private key isolation**: Keys never exposed in application code
- **Extension-based signing**: Maximum security via browser extensions
- **Request integrity**: NIP-98 prevents request tampering
- **Cryptographic proof**: All operations cryptographically verified

#### Firebase Security:

- **Traditional auth**: Email/password with industry standards
- **Token-based**: JWT tokens with automatic refresh
- **Minimal scope**: Only used for necessary business operations
- **Fail-closed**: Blocks operations if auth cannot be verified

#### Integration Security:

- **No shared secrets**: Separate authentication systems
- **Principle of least privilege**: Minimal required permissions
- **Clear separation**: Identity vs. business operations
- **Audit trail**: Complete logging of all operations

---

## 5. Technical Implementation

### 5.1 Core Hooks System

#### useCurrentUser Hook

```typescript
const { user, users, metadata } = useCurrentUser();
// user: NUser | undefined
// users: NUser[] (for multi-account scenarios)
// metadata: NostrMetadata from kind 0 events
```

**Purpose:** Primary interface for accessing authenticated user data

#### useAccountLinkingStatus Hook

```typescript
const { isLinked, firebaseUid, email, isLoading, error } =
  useAccountLinkingStatus();
```

**Purpose:** Checks if current Nostr pubkey is linked to Firebase account

#### useAccountLinking Hooks

```typescript
const linkAccount = useLinkFirebaseAccount();
const unlinkAccount = useUnlinkFirebaseAccount();
```

**Purpose:** Handles linking/unlinking operations with dual authentication

### 5.2 UI Components

#### LoginButton Component

- Displays "Log in" button when no user is authenticated
- Shows UserDropdownMenu when user is logged in
- Manages LoginDialog state
- Handles login success callbacks

#### FirebaseAuthDialog Component

- Handles Firebase authentication only (no auto-linking)
- Tabbed interface for sign in/sign up
- Sign-out flow for account switching
- Composable for different use cases

#### FirebaseOwnerGuard Component

- Protects owner-specific features
- Redirects to `/link-firebase` when linking needed
- Role-aware enforcement
- Non-blocking for basic features

### 5.3 API Endpoints

#### Account Linking Status

- **Endpoint**: `POST /v1/auth/check-pubkey-link`
- **Auth**: NIP-98 only
- **Purpose**: Check if pubkey is linked to Firebase UID

#### Link Account

- **Endpoint**: `POST /v1/auth/link-pubkey`
- **Auth**: Dual (NIP-98 + Firebase token)
- **Purpose**: Create association between pubkey and Firebase UID

#### Unlink Account

- **Endpoint**: `POST /v1/auth/unlink-pubkey`
- **Auth**: Firebase token only
- **Purpose**: Remove association between pubkey and Firebase UID

---

## 6. Current State & Analysis

### 6.1 Current Implementation Status

#### ✅ Working Well:

- **Nostr authentication**: Robust, user-friendly, multi-method support
- **Session management**: Reliable persistence and recovery
- **Role-based access**: Clear role determination and enforcement
- **Account linking**: Technically sound dual-auth implementation
- **Security**: Strong cryptographic foundations
- **Multi-account support**: Seamless account switching

#### ⚠️ Areas for Improvement:

- **Firebase UX**: Current linking flow could be more intuitive
- **Educational content**: Users need clearer understanding of benefits
- **Progressive disclosure**: Could better explain why Firebase is needed
- **Account management**: Linking/unlinking UX could be streamlined
- **Error handling**: Better user feedback for auth failures

#### 🔧 Recent Fixes Applied:

- **CORS configuration**: Added `x-firebase-token` header support
- **Auto-linking removal**: Made FirebaseAuthDialog more composable
- **Account switching**: Fixed unexpected linking during account switch
- **TypeScript improvements**: Removed `any` types for better type safety

### 6.2 Firebase as Optional Sidecar Analysis

#### Current State:

- Firebase linking is **technically optional** but **UX suggests required**
- FirebaseOwnerGuard **redirects immediately** when owner accesses dashboard
- **No gradual introduction** of Firebase benefits
- **Binary experience**: Either fully linked or blocked from features

#### Opportunities for Improvement:

1. **Defer Firebase prompts** until specific features are accessed
2. **Show preview** of what Firebase unlocks before requiring it
3. **Progressive disclosure** of Firebase benefits over time
4. **Clear opt-out messaging** for users who want to delay linking

### 6.3 Recommendations for UX Rework

#### Make Firebase Truly Optional:

1. **Feature-gated prompts**: Only prompt when accessing specific Firebase-required features
2. **Dashboard preview**: Allow basic dashboard access without Firebase
3. **Clear value proposition**: Better explain what Firebase unlocks with concrete examples
4. **Delayed onboarding**: Let users experience the platform before requiring additional auth

#### Improve User Education:

1. **Progressive disclosure**: Introduce Firebase benefits gradually over time
2. **Feature previews**: Show what users gain from linking with screenshots/demos
3. **Clear opt-out**: Make it obvious linking can be done later
4. **Role-based messaging**: Different messaging for owners vs. moderators vs. members

#### Enhance Account Management:

1. **Settings integration**: Centralized account management in settings
2. **Status visibility**: Clear indication of linking status throughout UI
3. **Easy switching**: Streamlined account switching for multiple Firebase accounts
4. **Graceful degradation**: Clear indication of which features require linking

---

## 7. File Reference

### Core Authentication Files:

- `/src/hooks/useCurrentUser.ts` - Primary user state management
- `/src/hooks/useLoggedInAccounts.ts` - Multi-account management
- `/src/hooks/useLoginActions.ts` - Login/logout functionality
- `/src/components/auth/LoginButton.tsx` - Main login UI
- `/src/components/auth/LoginDialog.tsx` - Authentication dialog
- `/src/components/auth/UserDropdownMenu.tsx` - Account management UI

### Firebase Integration Files:

- `/src/components/auth/FirebaseAuthDialog.tsx` - Firebase authentication dialog
- `/src/components/auth/FirebaseOwnerGuard.tsx` - Access control for owners
- `/src/hooks/useAccountLinking.ts` - Link/unlink operations
- `/src/hooks/useAccountLinkingStatus.ts` - Linking status checks
- `/src/pages/AccountLinking.tsx` - Account management page
- `/src/pages/LinkFirebase.tsx` - Firebase linking onboarding

### Supporting Files:

- `/src/components/NostrProvider.tsx` - Nostr context provider
- `/src/hooks/useProfileSync.ts` - Profile synchronization
- `/src/hooks/useAuthor.ts` - Profile data fetching
- `/src/lib/nip98Auth.ts` - HTTP authentication
- `/src/lib/firebaseLegacyAuth.ts` - Firebase authentication utilities
- `/src/contexts/CommunityContext.tsx` - Role-based access control
- `/src/App.tsx` - Provider stack initialization

### API Configuration:

- `/api/cmd/server/main.go` - CORS configuration and routing

---

## 8. User Testing Report (2025-01-03)

### Test Overview

- **Feature Tested**: Account linking functionality (Nostr + Firebase email)
- **User Flow**: New user signup → account linking → email authentication → unlinking/relinking
- **Test Duration**: ~6 minutes
- **Tester Experience**: Experienced user familiar with the application

### Critical Issues Identified

#### 1. Hard Page Refresh Bug (HIGH PRIORITY)

**Issue**: Page performs an undesirable hard refresh when linking Firebase email account

- **Occurrence**: Happens every time user signs in with Firebase email and password
- **Impact**: Disrupts user experience and may cause data loss
- **User Quote**: "The page appears to have hard refreshed. That is not desirable."

#### 2. Incorrect Dialog Title (MEDIUM PRIORITY)

**Issue**: Login dialog shows "Switch Firebase account" instead of appropriate title

- **Context**: When user clicks unlink and needs to re-authenticate
- **Expected**: Dialog should say "Log in to your Firebase account"
- **Current**: Shows "Switch Firebase account" which is confusing

#### 3. Missing Firebase Logout Integration (MEDIUM PRIORITY)

**Issue**: No automatic Firebase session clearing when user logs out of main application

- **Current Behavior**: Firebase tokens persist after main app logout
- **Expected Behavior**: Main app logout should automatically clear all Firebase session tokens
- **Impact**: Users remain authenticated to Firebase even after logging out, creating security and UX concerns

#### 4. Token Persistence Behavior (MEDIUM PRIORITY)

**Issue**: Firebase tokens appear to persist even after manual clearing

- **Behavior**: User could unlink account without re-authentication when tokens should have been cleared
- **Impact**: Inconsistent authentication state management

### Working Features

#### Account Linking Flow

- ✅ Get started button functions correctly
- ✅ User profile saving works
- ✅ Nostr identity connection successful
- ✅ Account linking page displays properly
- ✅ "Account not backed up" warning shows appropriately

#### Email Linking

- ✅ Link email button triggers Firebase login dialog
- ✅ Email account appears in account linking page after successful login
- ✅ Firebase user ID correctly displayed
- ✅ Linked email address shown correctly

#### Unlinking Functionality

- ✅ Unlink button accessible and functional
- ✅ Confirmation popup appears before unlinking
- ✅ Account successfully unlinks when confirmed
- ✅ Returns to "account not backed up" state after unlinking
- ✅ Re-authentication required when Firebase token cleared

### User Experience Observations

#### Positive Aspects

- User successfully completed all intended actions
- Account linking/unlinking flow is logically structured
- Confirmation dialogs prevent accidental actions
- Authentication state properly managed in most scenarios

#### Pain Points

- Hard refresh interrupts user flow
- Confusing dialog titles create uncertainty
- Token management inconsistency causes confusion

### Test Result Summary

- **Functionality**: 90% working as expected
- **User Experience**: Needs improvement due to hard refresh issue
- **Critical Blocker**: Hard refresh bug should be fixed before production deployment

---

## 9. Implementation Todo List

Based on the user testing report, the following tasks have been completed:

### High Priority ✅

- [x] **Fix hard page refresh bug** - Removed `window.location.reload()` and let React Query handle state updates (#auth-fix-hard-refresh)

### Medium Priority ✅

- [x] **Fix dialog title issue** - Made dialog titles contextually appropriate based on authentication state (#auth-fix-dialog-title)
- [x] **Implement Firebase logout integration** - Main app logout now automatically clears Firebase session tokens (#auth-firebase-logout)
- [x] **Fix token persistence** - Implemented consistent token clearing through Firebase logout integration (#auth-token-persistence)

### Low Priority ✅

- [x] **Add loading states** - Added loading overlay during account linking process (#auth-loading-states)
- [x] **Improve error handling** - Enhanced error messages with more user-friendly Firebase error mappings (#auth-error-handling)

## 10. Implementation Details

### 10.1 Hard Refresh Fix

- **File**: `src/pages/AccountLinking.tsx`
- **Change**: Removed `window.location.reload()` from `handleLinkSuccess`
- **Result**: UI updates reactively through React Query invalidation

### 10.2 Dialog Title Fix

- **File**: `src/pages/AccountLinking.tsx`
- **Change**: Made title dynamic based on `firebaseUser` state
- **Result**: Shows "Sign in to Firebase" or "Switch Firebase Account" appropriately

### 10.3 Firebase Logout Integration

- **File**: `src/components/auth/UserDropdownMenu.tsx`
- **Change**: Added Firebase sign out to main logout handler
- **Result**: Firebase tokens cleared automatically on app logout

### 10.4 Loading States Enhancement

- **File**: `src/pages/AccountLinking.tsx`
- **Change**: Added `isLinkingInProgress` state and loading overlay
- **Result**: Clear visual feedback during account linking

### 10.5 Error Handling Improvement

- **File**: `src/lib/firebase-auth-errors.ts`
- **Change**: Added more error code mappings
- **Result**: More helpful error messages for common scenarios

---

_Last Updated: 2025-01-03_  
_Version: 1.2.0_
_Changes: Completed all user testing feedback items_
