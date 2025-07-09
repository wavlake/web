# Wavlake Authentication System

## Overview

Wavlake implements a sophisticated multi-path authentication system that seamlessly integrates **Nostr** identity with **Firebase** business operations. The system provides three distinct user entry points while maintaining a unified experience.

## Authentication Flow Tree

### Main Entry Points (Index.tsx)

```
🏠 Landing Page (Index.tsx)
├── 🚀 "Get Started" (New Users)
│   └── → /create-account (onboarding flow)
│
├── 📧 "I have a Wavlake account" (Existing Email Users)
│   └── FirebaseAuthForm → ProfileDiscoveryScreen
│       ├── 📋 Has Linked Accounts
│       │   ├── Select Account → NostrAuthStep (targeted)
│       │   ├── Use Different Account → NostrAuthStep (open)
│       │   └── Generate New Account → /create-account
│       └── 🆕 No Linked Accounts  
│           ├── Generate New Account → /create-account (recommended)
│           └── Use Existing Nostr → NostrAuthStep (open)
│
└── 🔑 "I have a Nostr account" (Direct Nostr)
    └── LoginDialog → Success → /groups
```

## Core Components

### 1. **Index.tsx** - Authentication Orchestrator
**Purpose:** Central coordinator managing all authentication flows

**State Management:**
- `selectedPath`: Controls current authentication screen
- `firebaseUser`: Stores Firebase authentication result  
- `selectedPubkey`: Target pubkey for linked account auth
- `isNewFirebaseUser`: Performance optimization flag

**Key Features:**
- Multi-path authentication routing
- Context-aware navigation with state preservation
- Comprehensive error handling and fallbacks

### 2. **ProfileDiscoveryScreen.tsx** - Account Discovery
**Purpose:** Post-Firebase authentication flow for account linking

**Advanced Features:**
- **Performance Optimization:** Skips API calls for new users via `isNewUser` flag
- **Real-time Profile Data:** Dynamic profile loading with `useAuthor()` hook
- **Legacy Profile Integration:** Shows existing Wavlake profile data
- **Multi-scenario Handling:** Linked accounts, no accounts, new users

**State Integration:**
- `useLinkedPubkeys()` - Fetch associated Nostr accounts
- `useLegacyProfile()` - Retrieve existing Wavlake profile
- Conditional API optimization for performance

### 3. **NostrAuthStep.tsx** - Advanced Nostr Authentication  
**Purpose:** Comprehensive Nostr authentication with auto-linking

**Authentication Methods:**
- **Extension (NIP-07):** Browser extension one-click login
- **Nsec:** Private key input with file upload support
- **Bunker (NIP-46):** Remote signers and hardware wallets

**Advanced Features:**
- **Real-time Mismatch Detection:** Immediate pubkey validation feedback
- **Auto-linking Integration:** Seamless Firebase account association
- **Profile Selection UI:** Multi-account selection interface
- **Comprehensive Error Handling:** User-friendly error messages with retry logic

**Security Features:**
- Input validation at multiple layers
- No private key persistence
- Sanitized error messages
- HTTPS-only API communication

### 4. **FirebaseAuthForm.tsx** - Email/Password Authentication
**Purpose:** Traditional email/password authentication with modern UX

**Features:**
- Dual-mode interface (sign-in/sign-up)
- Real-time form validation
- `useFirebaseAuthForm()` hook integration
- Loading states and error handling
- Optional back navigation support

### 5. **LoginDialog.tsx** - Simple Nostr Authentication
**Purpose:** Streamlined Nostr login for direct authentication flows

**Features:**
- Clean tabbed interface (Extension/Nsec/Bunker)
- Automatic profile synchronization
- File upload support for private keys
- Stable component design (minimal modifications)

## Hook Architecture

### Authentication State Management

**`useCurrentUser()`** - Central Auth State
- Single source of truth for authentication
- Bridges Nostrify and legacy systems
- Automatic profile metadata integration
- Handles all login types (nsec, bunker, extension)

**`useLinkedPubkeys()`** - Account Linking
- Enterprise-grade caching with TanStack Query
- Multiple hook variants for different use cases
- Event-driven updates across components
- Background refetching with cache invalidation

**`useAutoLinkPubkey()`** - Auto-linking System
- Intelligent linking strategy selection
- Comprehensive validation and error handling
- Event system for cross-component communication
- Automatic cache invalidation after linking

## Advanced Features

### Real-time Mismatch Detection
- **Immediate Feedback:** Validates pubkey mismatches as user types
- **No Authentication:** Uses `nostr-tools` for pubkey extraction only
- **User-friendly Alerts:** Clear proceed/retry options
- **Performance Optimized:** No API calls during validation

### Performance Optimizations
- **New User Detection:** Skips unnecessary API calls during signup
- **Background Updates:** Non-blocking cache refreshes  
- **Conditional Rendering:** Components mount only when needed
- **Exponential Backoff:** Intelligent retry mechanisms

### Security Architecture
- **Input Validation:** Multi-layer validation for all inputs
- **Error Sanitization:** Prevents information leakage
- **Token Management:** Secure Firebase token handling
- **HTTPS Enforcement:** All API communication over HTTPS

## Development Guidelines

### Authentication State
```tsx
// Always use for auth state
const { user } = useCurrentUser();
if (!user) return <LoginRequired />;

// Check specific authentication status
const { isLoading } = useCurrentUser();
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
// Use NostrAuthStep for advanced auth with linking
<NostrAuthStep
  firebaseUser={firebaseUser}
  linkedPubkeys={linkedPubkeys}
  expectedPubkey={targetPubkey} // for targeted auth
  onSuccess={handleSuccess}
  onBack={handleBack}
  enableAutoLink={true}
/>

// Use LoginDialog for simple direct auth
<LoginDialog
  isOpen={isOpen}
  onClose={handleClose}
  onLogin={handleSuccess}
/>
```

## Error Handling Patterns

### User-Friendly Messages
- Network errors → "Please check your connection"
- Invalid inputs → "Please check your credentials"
- Rate limiting → "Too many attempts, please wait"
- Extension errors → "Please ensure your Nostr extension is working"

### Fallback Options
- Extension unavailable → Show nsec input
- Network failures → Retry mechanisms
- Validation errors → Clear guidance for correction
- Authentication failures → Alternative methods

## Testing Considerations

### Test Scenarios
- **User States:** 0, 1, and multiple linked pubkeys
- **New vs Returning:** Different optimization paths
- **Network Conditions:** Offline/online state handling
- **Error Cases:** All failure modes with proper recovery

### Performance Testing
- **API Call Optimization:** Verify new user flag effectiveness
- **Cache Efficiency:** Background updates vs fresh loads
- **Real-time Validation:** Input responsiveness
- **Navigation Speed:** State transition performance

## Integration Points

### Firebase ↔ Nostr Bridge
- Seamless account association
- Automatic profile synchronization
- Event-driven cache updates
- Secure token management

### Navigation Flow
- Context-aware routing
- State preservation across navigation
- Proper cleanup on authentication success
- Memory management for sensitive data

### Event System
- Custom events for cross-component communication
- Automatic cache invalidation triggers
- Real-time UI updates
- Background synchronization

This authentication system represents a production-ready, enterprise-grade implementation that balances security, performance, and user experience while seamlessly integrating multiple authentication providers.