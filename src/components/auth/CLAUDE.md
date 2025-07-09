# Wavlake Authentication System

## Overview

Wavlake implements a sophisticated authentication system built on the **AuthFlow** state machine pattern that seamlessly integrates **Nostr** identity with **Firebase** business operations. The system provides three distinct user entry points while maintaining a unified, predictable experience.

## Architecture Overview

### Core Pattern: AuthFlow State Machine

The authentication system is built around a state machine that provides predictable transitions and eliminates impossible states:

```
📍 method-selection → 🔑 nostr-auth → ✅ completed
📍 method-selection → 📧 firebase-auth → 🔍 account-discovery → 🔗 account-linking → ✅ completed
📍 method-selection → 🆕 create-account → [navigate to /create-account]
```

### Main Entry Point: AuthFlow

**File:** `src/components/auth/AuthFlow.tsx`  
**Purpose:** Central orchestrator that replaced the complex 312-line legacy Index.tsx with a clean, state machine-driven flow.

**Key Features:**
- State machine-driven navigation with predictable transitions
- Automatic authenticated user redirection to `/groups`
- Comprehensive error handling with graceful fallbacks
- Profile synchronization on successful authentication
- Context-aware component rendering

## Core Components

### 1. **AuthFlow.tsx** - Main Authentication Orchestrator
**Purpose:** Central coordinator managing all authentication flows using state machine pattern

**State Management:**
- `state`: Current state object (method-selection, nostr-auth, firebase-auth, account-discovery, account-linking, completed, error)
- `context`: Context data (firebaseUser, selectedPubkey, error, isNewUser)
- `send`: Function to dispatch state machine events

**Key Features:**
- Predictable state transitions with TypeScript safety
- Automatic profile synchronization on successful login
- Context-aware navigation with proper cleanup
- Integration with all authentication hooks

### 2. **AuthMethodSelector.tsx** - Method Selection Interface
**Purpose:** Clean interface for selecting authentication method

**Methods Supported:**
- **Direct Nostr Authentication:** "I have a Nostr account"
- **Firebase Authentication:** "I have a Wavlake account" 
- **Account Creation:** "Get Started" (navigates to /create-account)

**Features:**
- Responsive design with consistent styling
- Loading states during method selection
- Error display with retry capabilities
- Accessibility-compliant button interactions

### 3. **NostrAuthForm.tsx** - Nostr Authentication
**Purpose:** Comprehensive Nostr authentication supporting all standard methods

**Authentication Methods:**
- **Extension (NIP-07):** Browser extension one-click login
- **Nsec:** Private key input with secure file upload support
- **Bunker (NIP-46):** Remote signers and hardware wallets

**Advanced Features:**
- **Real-time Pubkey Validation:** Immediate feedback for expected pubkey mismatches
- **Auto-linking Integration:** Seamless Firebase account association
- **Comprehensive Error Handling:** User-friendly error messages with retry logic
- **File Upload Support:** Secure nsec file handling with validation

**Security Features:**
- Input validation at multiple layers
- No private key persistence or logging
- Sanitized error messages to prevent information leakage
- HTTPS-only API communication

### 4. **FirebaseAuthForm.tsx** - Email/Password Authentication
**Purpose:** Modern email/password authentication with dual-mode interface

**Features:**
- **Dual-mode Interface:** Seamless switching between sign-in and sign-up
- **Real-time Validation:** Email format and password strength validation
- **Loading States:** Proper loading indicators during authentication
- **Error Handling:** Clear error messages with retry options
- **Back Navigation:** Optional back button for multi-step flows

**Integration:**
- Uses `useFirebaseAuthentication()` hook for authentication logic
- Automatic navigation to account discovery on success
- Proper cleanup on component unmount

### 5. **AccountDiscoveryScreen.tsx** - Post-Firebase Account Discovery
**Purpose:** Discovers and presents linked Nostr accounts after Firebase authentication

**Advanced Features:**
- **Performance Optimization:** Skips API calls for new users via `isNewUser` flag
- **Real-time Profile Data:** Dynamic profile loading with `useAuthor()` hook
- **Legacy Profile Integration:** Shows existing Wavlake profile data for migration
- **Multi-scenario Handling:** Graceful handling of linked accounts, no accounts, and new users

**User Flow Options:**
- **Select Existing Account:** Choose from linked Nostr accounts
- **Use Different Account:** Open Nostr auth with any account
- **Generate New Account:** Create new Nostr account with legacy profile data

**State Integration:**
- `useAccountDiscovery()` hook for linked accounts and legacy profile
- Real-time loading states and error handling
- Manual refresh capability for troubleshooting

### 6. **LoginDialog.tsx** - Simple Direct Nostr Authentication
**Purpose:** Streamlined Nostr login for direct authentication flows

**Features:**
- **Clean Tabbed Interface:** Extension/Nsec/Bunker tabs with consistent UX
- **Automatic Profile Sync:** Profile synchronization on successful login
- **File Upload Support:** Secure nsec file handling
- **Expected Pubkey Support:** Validation for targeted authentication scenarios

**Integration:**
- Modal dialog with proper focus management
- Integration with `useNostrAuthentication()` hook
- Automatic cleanup on close/success

## Hook Architecture

### State Management Hooks

#### **useAuthFlow()** - Core State Machine
**Purpose:** Central state machine managing the entire authentication flow

**Returns:**
- `state`: Current state object with predictable transitions
- `context`: Context data (firebaseUser, selectedPubkey, error, isNewUser)
- `send`: Function to dispatch state machine events
- `can`: Function to check if event can be sent in current state

**Usage:**
```tsx
const { state, send, context } = useAuthFlow();

switch (state.type) {
  case 'method-selection':
    return <AuthMethodSelector onSelectMethod={(method) => send({ type: `SELECT_${method.toUpperCase()}` })} />;
  case 'nostr-auth':
    return <NostrAuthForm onSuccess={(login) => send({ type: 'NOSTR_SUCCESS', login })} />;
}
```

#### **useCurrentUser()** - Authentication State
**Purpose:** Single source of truth for authentication state

**Features:**
- Bridges Nostrify and legacy authentication systems
- Automatic profile metadata integration
- Handles all login types (nsec, bunker, extension)
- Provides loading states and error handling

**Usage:**
```tsx
const { user, isLoading } = useCurrentUser();
if (!user) return <LoginRequired />;
```

### Authentication Hooks

#### **useNostrAuthentication()** - Pure Nostr Authentication
**Purpose:** Handles all Nostr authentication methods without side effects

**Returns:**
- `authenticate`: Main auth function `(method, credentials) => Promise<NLoginType>`
- `isLoading`: Loading state indicator
- `error`: Error message string
- `supportedMethods`: Array of supported authentication methods
- `clearError`: Function to clear error state

**Usage:**
```tsx
const { authenticate, isLoading, error } = useNostrAuthentication();

const handleAuth = async () => {
  try {
    const login = await authenticate('extension', { method: 'extension' });
    onSuccess(login);
  } catch (error) {
    // Error handled by hook
  }
};
```

#### **useFirebaseAuthentication()** - Pure Firebase Authentication
**Purpose:** Handles email/password authentication with Firebase

**Returns:**
- `signIn`: Function `(email, password) => Promise<{user, isNewUser}>`
- `signUp`: Function `(email, password) => Promise<{user, isNewUser}>`
- `isLoading`: Loading state indicator
- `error`: Error message string
- `clearError`: Function to clear error state

**Usage:**
```tsx
const { signIn, signUp, isLoading, error } = useFirebaseAuthentication();

const handleSubmit = async (email, password, isSignUp) => {
  try {
    const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
    onSuccess(result.user, result.isNewUser);
  } catch (error) {
    // Error handled by hook
  }
};
```

### Account Management Hooks

#### **useLinkedPubkeys()** - Account Linking Management
**Purpose:** Fetches and manages linked pubkeys for Firebase accounts

**Parameters:**
- `firebaseUser`: Firebase user object
- `options`: Configuration object with caching and refetch options

**Returns:**
- `data`: Array of LinkedPubkey objects
- `isLoading`: Initial fetch loading state
- `error`: Error if fetch failed
- `isFetching`: Background fetch state
- `refetch`: Manual refetch function
- `invalidate`: Cache invalidation function
- `primaryPubkey`: Primary pubkey if available
- `count`: Number of linked pubkeys

**Features:**
- **Enterprise-grade Caching:** TanStack Query with optimistic updates
- **Background Refetching:** Automatic data freshening on window focus
- **Performance Optimization:** Configurable stale time and cache retention
- **Error Recovery:** Exponential backoff with jitter for network failures

**Usage:**
```tsx
const { data: linkedPubkeys, isLoading, error, refetch } = useLinkedPubkeys(firebaseUser);

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
  <div>
    {linkedPubkeys.map(pubkey => (
      <div key={pubkey.pubkey}>{pubkey.pubkey.slice(0, 8)}...</div>
    ))}
  </div>
);
```

#### **useAutoLinkPubkey()** - Automatic Account Linking
**Purpose:** Intelligent account linking with comprehensive validation

**Returns:**
- `autoLink`: Main function `(firebaseUser, pubkey?, signer?) => Promise<AutoLinkResult>`
- `state`: 'idle' | 'linking' | 'success' | 'error'
- `isLinking`: Boolean loading state
- `lastError`: Last error that occurred
- `resetState`: Function to reset to idle state
- `clearError`: Function to clear error state

**Features:**
- **Intelligent Linking Strategy:** Automatic detection of optimal linking approach
- **Comprehensive Validation:** Multi-layer validation with user-friendly error messages
- **Event-driven Updates:** Custom events for cross-component communication
- **Cache Invalidation:** Automatic cache refresh after successful linking

**Usage:**
```tsx
const { autoLink, isLinking, state, lastError } = useAutoLinkPubkey({
  showNotifications: true
});

const result = await autoLink(firebaseUser, pubkey);
```

#### **useAccountDiscovery()** - Account Discovery
**Purpose:** Discovers linked accounts and legacy profile data

**Parameters:**
- `firebaseUser`: Firebase user object
- `isNewUser`: Skip API calls for new users (performance optimization)

**Returns:**
- `linkedAccounts`: Array of LinkedAccount objects
- `legacyProfile`: Legacy profile data or null
- `isLoading`: Loading state
- `error`: Error message string
- `refresh`: Manual refresh function

**Features:**
- **Performance Optimization:** Skips unnecessary API calls for new users
- **Legacy Profile Integration:** Retrieves existing Wavlake profile data
- **Real-time Updates:** Background data fetching with cache invalidation

**Usage:**
```tsx
const { linkedAccounts, legacyProfile, isLoading, error, refresh } = useAccountDiscovery(firebaseUser, isNewUser);

if (isLoading) return <div>Loading your accounts...</div>;
if (error) return <div>Error: {error}</div>;

return (
  <div>
    <h2>Found {linkedAccounts.length} linked accounts</h2>
    {legacyProfile && <div>Legacy profile: {legacyProfile.displayName}</div>}
  </div>
);
```

#### **useAccountLinking()** - Account Linking Operations
**Purpose:** Handles linking and unlinking operations

**Returns:**
- `linkAccount`: Function `(firebaseUser, pubkey) => Promise<void>`
- `unlinkAccount`: Function `(pubkey) => Promise<void>`
- `isLinking`: Loading state
- `error`: Error message string
- `clearError`: Function to clear error state

**Usage:**
```tsx
const { linkAccount, unlinkAccount, isLinking, error } = useAccountLinking({
  showNotifications: true
});

const handleLink = async () => {
  try {
    await linkAccount(firebaseUser, pubkey);
    onLinkingComplete();
  } catch (error) {
    // Error handled by hook
  }
};
```

## Advanced Features

### State Machine Benefits
- **Predictable Transitions:** No impossible states or race conditions
- **TypeScript Safety:** Full type safety for state and context
- **Debugging:** Clear state visibility in development
- **Error Recovery:** Graceful error handling with retry capabilities

### Performance Optimizations
- **New User Detection:** Skips unnecessary API calls during signup flow
- **Background Updates:** Non-blocking cache refreshes for real-time data
- **Conditional Rendering:** Components mount only when needed
- **Exponential Backoff:** Intelligent retry mechanisms for network failures

### Real-time Pubkey Validation
- **Immediate Feedback:** Validates pubkey mismatches as user types
- **No Authentication:** Uses `nostr-tools` for client-side pubkey extraction
- **User-friendly Alerts:** Clear proceed/retry options with context
- **Performance Optimized:** No API calls during validation

### Security Architecture
- **Input Validation:** Multi-layer validation for all user inputs
- **Error Sanitization:** Prevents information leakage through error messages
- **Token Management:** Secure Firebase token handling with refresh logic
- **HTTPS Enforcement:** All API communication over HTTPS in production
- **No Key Persistence:** Private keys never stored or logged

## Development Guidelines

### Authentication State Management
```tsx
// Always use for authentication state
const { user, isLoading } = useCurrentUser();
if (!user) return <LoginRequired />;

// State machine integration
const { state, send } = useAuthFlow();
if (state.type === 'nostr-auth') {
  return <NostrAuthForm onSuccess={(login) => send({ type: 'NOSTR_SUCCESS', login })} />;
}
```

### Account Linking
```tsx
// Check for linked accounts
const { data: linkedPubkeys, isLoading } = useLinkedPubkeys(firebaseUser);

// Auto-link accounts
const { autoLink, isLinking } = useAutoLinkPubkey();
await autoLink(firebaseUser, pubkey);
```

### Navigation Patterns
```tsx
// Always include source context for create-account
navigate("/create-account", {
  state: {
    source: "onboarding", // or "firebase-generation"
    returnPath: "/groups",
    firebaseUserData: userData // if applicable
  }
});
```

### Component Integration
```tsx
// Use AuthFlow for complete authentication system
<AuthFlow />

// Use individual components for custom flows
<NostrAuthForm
  onSuccess={handleSuccess}
  onError={handleError}
  expectedPubkey={targetPubkey} // for targeted auth
/>

// Use LoginDialog for simple direct auth
<LoginDialog
  isOpen={isOpen}
  onClose={handleClose}
  onLogin={handleSuccess}
  expectedPubkey={targetPubkey} // optional
/>
```

## Error Handling Patterns

### User-Friendly Messages
- **Network Errors:** "Please check your connection and try again"
- **Invalid Inputs:** "Please check your credentials and try again"
- **Rate Limiting:** "Too many attempts, please wait a moment"
- **Extension Errors:** "Please ensure your Nostr extension is working"

### Fallback Options
- **Extension Unavailable:** Automatically show nsec input option
- **Network Failures:** Retry mechanisms with exponential backoff
- **Validation Errors:** Clear guidance for correction with examples
- **Authentication Failures:** Alternative authentication methods

### Error Recovery
- **Retry Logic:** Intelligent retry with exponential backoff
- **State Reset:** Clean state reset on error recovery
- **User Guidance:** Clear instructions for resolving common issues
- **Graceful Degradation:** Fallback to simpler auth methods when needed

## Testing Considerations

### Test Scenarios
- **User States:** Test with 0, 1, and multiple linked pubkeys
- **New vs Returning:** Different optimization paths and user flows
- **Network Conditions:** Offline/online state handling and recovery
- **Error Cases:** All failure modes with proper recovery mechanisms

### Performance Testing
- **API Call Optimization:** Verify new user flag effectiveness
- **Cache Efficiency:** Background updates vs fresh loads
- **Real-time Validation:** Input responsiveness and accuracy
- **Navigation Speed:** State transition performance and smoothness

### Security Testing
- **Input Validation:** Test all input validation layers
- **Error Information:** Verify no sensitive information leakage
- **Token Security:** Proper token handling and refresh logic
- **HTTPS Enforcement:** All API calls over HTTPS in production

## Integration Points

### Firebase ↔ Nostr Bridge
- **Seamless Association:** Automatic account linking with validation
- **Profile Synchronization:** Real-time profile data synchronization
- **Event-driven Updates:** Custom events for cross-component communication
- **Secure Token Management:** Proper Firebase token handling

### Navigation Flow
- **Context-aware Routing:** Intelligent navigation based on user state
- **State Preservation:** Proper state management across navigation
- **Memory Management:** Cleanup of sensitive data on navigation
- **URL State:** Clean URL management without sensitive data

### Event System
- **Custom Events:** Cross-component communication for real-time updates
- **Cache Invalidation:** Automatic cache refresh on account changes
- **Background Sync:** Background data synchronization
- **Error Propagation:** Proper error handling across component boundaries

## Current Implementation Status

### ✅ **Completed Components**
- **AuthFlow:** Complete state machine implementation
- **AuthMethodSelector:** Full method selection interface
- **NostrAuthForm:** Comprehensive Nostr authentication
- **FirebaseAuthForm:** Complete email/password authentication
- **AccountDiscoveryScreen:** Full account discovery functionality
- **LoginDialog:** Simple direct Nostr authentication

### ✅ **Completed Hooks**
- **useAuthFlow:** Complete state machine implementation
- **useNostrAuthentication:** Pure Nostr authentication
- **useFirebaseAuthentication:** Pure Firebase authentication
- **useAccountDiscovery:** Account discovery with optimization
- **useAccountLinking:** Account linking operations
- **useAutoLinkPubkey:** Automatic account linking
- **useLinkedPubkeys:** Comprehensive linked pubkey management

### ✅ **Completed Features**
- **State Machine Pattern:** Predictable authentication flow
- **Real-time Validation:** Immediate feedback on user input
- **Performance Optimization:** Smart API call optimization
- **Error Handling:** Comprehensive error management
- **Security:** Multi-layer validation and secure token handling

This authentication system represents a production-ready, enterprise-grade implementation that balances security, performance, and user experience while seamlessly integrating multiple authentication providers through a clean, predictable state machine pattern.