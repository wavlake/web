# Legacy Authentication System Catalog

This document catalogs the existing authentication system that has been moved to `/legacy-login` for preservation during the refactor.

## Legacy Components Inventory

### Core Authentication Components
Located in: `src/components/auth/legacy/`

#### 1. **LegacyLoginDialog.tsx** (originally LoginDialog.tsx)
- **Purpose**: Simple Nostr authentication dialog with tabs
- **Size**: 243 lines
- **Features**: Extension, nsec, and bunker authentication
- **Dependencies**: useLoginActions, useProfileSync
- **Issues**: 
  - Mixes UI and authentication logic
  - File upload handling embedded in component
  - State management scattered across component

#### 2. **LegacyNostrAuthStep.tsx** (originally NostrAuthStep.tsx)  
- **Purpose**: Complex multi-method Nostr authentication with auto-linking
- **Size**: 922 lines
- **Features**: Extension, nsec, bunker auth + profile selection + auto-linking
- **Dependencies**: useLoginActions, useProfileSync, useAutoLinkPubkey, useAuthor
- **Issues**:
  - **MASSIVE COMPLEXITY**: Single component handling multiple responsibilities
  - UI logic mixed with business logic throughout
  - Complex state management with 10+ state variables
  - Multiple authentication modes in single component
  - Error handling scattered throughout
  - Real-time validation logic embedded in UI

#### 3. **LegacyFirebaseAuthForm.tsx** (originally FirebaseAuthForm.tsx)
- **Purpose**: Email/password authentication with Firebase
- **Dependencies**: useFirebaseAuthForm hook
- **Issues**: Reasonable separation, hook handles most logic

#### 4. **LegacyProfileDiscoveryScreen.tsx** (originally ProfileDiscoveryScreen.tsx)
- **Purpose**: Post-Firebase authentication account discovery
- **Features**: Shows linked accounts, profile data, action buttons
- **Dependencies**: useLinkedPubkeys, useLegacyProfile, useAuthor
- **Issues**: Complex conditional rendering based on account states

#### 5. **Supporting Components**
- **LoginArea.tsx**: Additional auth UI
- **LoginChoiceContent.tsx**: Auth choice interface
- **FirebaseActionGuard.tsx**: Firebase auth guard
- **PubkeyMismatchAlert.tsx**: Mismatch alert UI
- **WelcomeRedirect.tsx**: Auth-based redirect logic
- **AccountSwitcher.tsx**: Account switching UI
- **UnlinkConfirmDialog.tsx**: Account unlinking confirmation

## Legacy Hooks Inventory

### Core Authentication Hooks
Located in: `src/hooks/legacy/`

#### 1. **useLegacyCurrentUser.ts** (originally useCurrentUser.ts)
- **Purpose**: Central authentication state management
- **Size**: 79 lines
- **Features**: Bridges Nostrify and legacy systems
- **Dependencies**: useNostrLogin, useLoggedInAccounts, useAuthor
- **Issues**: Fallback logic complexity, multiple user sources

#### 2. **useLegacyLoginActions.ts** (originally useLoginActions.ts)
- **Purpose**: Nostr login method implementations
- **Size**: 48 lines
- **Features**: nsec, bunker, extension login methods
- **Assessment**: Well-designed, minimal issues

#### 3. **useLegacyAutoLinkPubkey.ts** (originally useAutoLinkPubkey.ts)
- **Purpose**: Automatic account linking functionality
- **Size**: 297 lines
- **Features**: Auto-linking with validation and error handling
- **Dependencies**: useFirebaseLegacyAuth, useLinkFirebaseAccount
- **Issues**: Complex configuration and state management

#### 4. **useLegacyLinkedPubkeys.ts** (originally useLinkedPubkeys.ts)
- **Purpose**: Fetch and manage linked pubkeys for Firebase accounts
- **Size**: 679 lines
- **Features**: Comprehensive API integration with caching
- **Issues**: Very large hook with multiple responsibilities

#### 5. **Supporting Hooks**
- **useFirebaseAuthForm.ts**: Firebase form logic
- **useProfileSync.ts**: Profile synchronization
- **useAccountLinking.ts**: Account linking operations
- **useAccountLinkingStatus.ts**: Linking status queries
- **useLegacyProfile.ts**: Legacy profile data

## Legacy Entry Point

### **LegacyIndex.tsx** (originally src/pages/Index.tsx)
- **Purpose**: Main authentication orchestrator
- **Size**: 312 lines  
- **Features**: Multi-path auth routing, state management
- **Issues**:
  - **COMPLEX STATE MANAGEMENT**: 8+ state variables
  - Deep conditional rendering logic
  - Complex navigation state handling
  - Prop drilling through auth flows
  - Difficult to track user flow state

## Key Architectural Issues Identified

### 1. **UI/Logic Coupling**
- Authentication logic embedded in UI components
- State management scattered across components
- Business logic mixed with presentation logic

### 2. **Component Complexity**
- Single components handling multiple responsibilities
- `NostrAuthStep.tsx` is 922 lines with multiple modes
- Complex conditional rendering throughout

### 3. **State Management Problems**
- No centralized state machine
- State scattered across multiple variables
- Difficult to track auth flow progression
- Complex prop drilling patterns

### 4. **Navigation Complexity**
- Multiple auth paths with nested conditionals
- Unclear state transitions
- Hard to understand user flow

### 5. **Testing Challenges**
- Business logic embedded in UI makes testing difficult
- Complex dependencies between components
- Mock requirements for testing authentication flows

### 6. **Maintainability Issues**
- Large files that are difficult to modify
- Unclear separation of concerns
- Complex interdependencies

## Migration Notes

The legacy system has been preserved in its entirety at `/legacy-login` route to:
1. Maintain working fallback during refactor
2. Reference implementation details during rebuild
3. Compare behavior with new system
4. Allow rollback if needed

## New System Goals

Based on legacy analysis, the new system should address:
1. **Clear Separation**: UI components only handle presentation
2. **State Machine**: Centralized auth flow state management  
3. **Single Responsibility**: Each component/hook has one clear purpose
4. **Testability**: Business logic separated and testable
5. **Maintainability**: Smaller, focused files that are easy to modify
6. **Type Safety**: Comprehensive TypeScript throughout

---

*Generated during authentication system refactor - preserves implementation knowledge*