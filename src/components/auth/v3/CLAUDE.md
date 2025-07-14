# Wavlake Authentication V3 System

## Overview

This document describes the **v3 authentication system** - a practical, component-based approach with simple state machines focused on getting users authenticated quickly and efficiently. This system is actively implemented and working in the Wavlake application.

## 🏗️ Architecture Philosophy

### Core Pattern: Component-Based State Machines + Fresh Hook Design

The v3 system uses:
- **Lightweight state machines** within individual components for clear UI flows
- **Fresh, purpose-built hooks** designed specifically for v3 components (no legacy tech debt)
- **Clean separation** between business logic (hooks) and presentation (components)
- **Predictable flows** that users can understand and navigate easily

```
📍 AuthFlow (method-selection) → 🆕 SignUp (multi-step) → ✅ authenticated
📍 AuthFlow (method-selection) → 🔑 SignIn (nostr → legacy) → ✅ authenticated
```

## 🎯 Current Implementation Status

### ✅ **Working Components (v3)**
- `AuthFlow.tsx` - Main orchestrator with method selection
- `AuthMethodSelector.tsx` - Pure UI for method selection  
- `SignUp.tsx` - Multi-step signup with user type selection
- `SignIn.tsx` - Two-step signin (nostr → legacy migration)
- `NostrAuthForm.tsx` - Tabbed Nostr authentication
- `FirebaseAuthForm.tsx` - Email/password form with validation

### 🔄 **Hook Integration Status**
- `NostrAuthForm` uses legacy `useLoginActions` (needs fresh v3 hook)
- `FirebaseAuthForm` has form logic only (needs fresh v3 hook)
- Account linking hooks exist but not integrated into main flows
- Missing coordinated state management across components

### 📋 **Legacy Hooks Available (Not Integrated)**
- `useFirebaseAuthentication` - Firebase auth operations
- `useNostrAuthentication` - Nostr auth operations  
- `useAccountLinking` - Account linking operations
- `useAccountDiscovery` - Account discovery after Firebase auth
- `useAutoLinkPubkey` - Automatic account linking

## 🚀 Improvement Plan: Fresh V3 Hook Architecture

### Core Strategy: Start Fresh, No Tech Debt

Instead of integrating existing hooks with potential tech debt, we'll create **new v3-specific hooks** designed around our current component needs:

1. **Clean API Design** - Hooks designed for our specific v3 component patterns
2. **No Legacy Constraints** - Fresh implementation without backward compatibility concerns  
3. **Component-Centric** - Hooks shaped by actual component usage patterns
4. **Modern Patterns** - Latest React patterns, TanStack Query, and TypeScript best practices

## 📋 **Complete Implementation Plan**

### Phase 1: Foundation - Fresh Hook Architecture (Week 1)
**Goal**: Create new v3-specific hooks with clean, modern APIs

#### **New Hook Design Principles**
```tsx
// V3 Hook Pattern - Clean, predictable API
function useV3AuthHook() {
  return {
    // Actions: async functions that do things
    authenticate: async (credentials) => { ... },
    
    // State: current state of the operation  
    isLoading: boolean,
    error: string | null,
    
    // Utilities: helper functions
    clearError: () => void,
    canRetry: boolean,
    
    // Data: results of operations
    result: AuthResult | null
  };
}
```

#### **1.1 Create useV3FirebaseAuth Hook**
**Purpose**: Firebase authentication designed for FirebaseAuthForm component

**API Design**:
```tsx
interface UseV3FirebaseAuthResult {
  // Primary actions
  signIn: (email: string, password: string) => Promise<V3FirebaseResult>;
  signUp: (email: string, password: string) => Promise<V3FirebaseResult>;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Utilities  
  clearError: () => void;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string, isSignUp?: boolean) => boolean;
  getPasswordStrength: (password: string) => 'weak' | 'medium' | 'strong';
}

interface V3FirebaseResult {
  user: FirebaseUser;
  isNewUser: boolean;
  requiresAccountDiscovery: boolean; // New: indicates if we should show account discovery
}
```

**Features**:
- Designed specifically for FirebaseAuthForm's dual-mode interface
- Built-in validation helpers for real-time form validation
- Returns discovery hints for account linking flow
- Clean error handling with user-friendly messages

#### **1.2 Create useV3NostrAuth Hook**  
**Purpose**: Nostr authentication designed for NostrAuthForm tabbed interface

**API Design**:
```tsx
interface UseV3NostrAuthResult {
  // Primary actions - one per tab
  authenticateExtension: () => Promise<V3NostrResult>;
  authenticateNsec: (nsec: string) => Promise<V3NostrResult>;
  authenticateBunker: (uri: string) => Promise<V3NostrResult>;
  
  // State per method
  loading: {
    extension: boolean;
    nsec: boolean; 
    bunker: boolean;
  };
  
  // Errors per method (for tab-specific error display)
  errors: {
    extension: string | null;
    nsec: string | null;
    bunker: string | null;
  };
  
  // Utilities
  clearError: (method: 'extension' | 'nsec' | 'bunker') => void;
  clearAllErrors: () => void;
  validateNsec: (nsec: string) => boolean;
  validateBunkerUri: (uri: string) => boolean;
  
  // Method availability  
  isExtensionAvailable: boolean;
  supportedMethods: NostrMethod[];
}

interface V3NostrResult {
  login: NLoginType;
  pubkey: string;
  method: 'extension' | 'nsec' | 'bunker';
}
```

**Features**:
- Tab-specific loading and error states for NostrAuthForm
- Method availability detection
- Built-in validation for nsec and bunker URI formats
- File upload helper integration for nsec files

#### **1.3 Create useV3AuthState Hook**
**Purpose**: Coordinated state management across all v3 auth components

**API Design**:
```tsx
interface UseV3AuthStateResult {
  // Current auth state
  currentUser: AuthenticatedUser | null;
  isAuthenticated: boolean;
  
  // Flow coordination
  currentFlow: 'signup' | 'signin' | 'discovery' | 'completed' | null;
  setCurrentFlow: (flow: AuthFlow) => void;
  
  // Cross-component state
  globalLoading: boolean;
  globalError: string | null;
  
  // Success handlers
  onAuthSuccess: (result: V3NostrResult | V3FirebaseResult) => Promise<void>;
  onProfileSync: (pubkey: string) => Promise<void>;
  
  // Utilities
  clearGlobalError: () => void;
  reset: () => void;
}
```

**Features**:
- Manages authentication state across all components
- Coordinates profile sync after successful auth
- Provides global loading/error states
- Handles navigation after successful authentication

### Phase 2: Component Integration (Week 2)  
**Goal**: Integrate new hooks into existing components with clean patterns

#### **2.1 FirebaseAuthForm Integration**
```tsx
// Clean integration with new hook
function FirebaseAuthForm({ onComplete }: FirebaseAuthFormProps) {
  const { signIn, signUp, isLoading, error, clearError, validateEmail, validatePassword } = useV3FirebaseAuth();
  const { onAuthSuccess } = useV3AuthState();
  
  const handleSubmit = async (email: string, password: string, isSignUp: boolean) => {
    try {
      const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
      await onAuthSuccess(result);
      if (result.requiresAccountDiscovery) {
        // Navigate to account discovery
      } else {
        onComplete?.();
      }
    } catch (error) {
      // Error already handled by hook
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorAlert message={error} onDismiss={clearError} />}
      {/* Form fields with real-time validation */}
    </form>
  );
}
```

#### **2.2 NostrAuthForm Integration**
```tsx
// Tab-specific integration with new hook
function NostrAuthForm() {
  const {
    authenticateExtension,
    authenticateNsec, 
    authenticateBunker,
    loading,
    errors,
    clearError,
    isExtensionAvailable
  } = useV3NostrAuth();
  const { onAuthSuccess } = useV3AuthState();
  
  const handleExtensionAuth = async () => {
    try {
      const result = await authenticateExtension();
      await onAuthSuccess(result);
    } catch (error) {
      // Error handled by hook, displayed in tab
    }
  };
  
  return (
    <Tabs defaultValue={isExtensionAvailable ? "extension" : "nsec"}>
      <TabsContent value="extension">
        {errors.extension && <ErrorAlert message={errors.extension} onDismiss={() => clearError('extension')} />}
        <Button onClick={handleExtensionAuth} disabled={loading.extension}>
          {loading.extension ? "Authenticating..." : "Login with Extension"}
        </Button>
      </TabsContent>
      {/* Other tabs */}
    </Tabs>
  );
}
```

#### **2.3 AuthFlow State Coordination**
```tsx
// Coordinated state management
function AuthFlow() {
  const [localState, setLocalState] = useState<"method-selection" | "sign-up" | "sign-in">("method-selection");
  const { currentFlow, setCurrentFlow, globalLoading, globalError } = useV3AuthState();
  
  // Coordinate local and global state
  useEffect(() => {
    setCurrentFlow(localState === "sign-up" ? "signup" : localState === "sign-in" ? "signin" : null);
  }, [localState]);
  
  if (globalLoading) {
    return <LoadingScreen message="Completing authentication..." />;
  }
  
  return (
    <div>
      {globalError && <GlobalErrorAlert message={globalError} />}
      {/* Component switching based on localState */}
    </div>
  );
}
```

### Phase 3: Account Discovery & Linking Integration (Week 3)
**Goal**: Seamlessly integrate account discovery and linking into main auth flows

#### **3.1 Create useV3AccountDiscovery Hook**
**Purpose**: Account discovery designed for post-Firebase auth flow

**API Design**:
```tsx
interface UseV3AccountDiscoveryResult {
  // Discovery operation
  discoverAccounts: (firebaseUser: FirebaseUser) => Promise<V3DiscoveryResult>;
  
  // State
  isDiscovering: boolean;
  error: string | null;
  
  // Results
  linkedAccounts: LinkedAccount[];
  legacyProfile: LegacyProfile | null;
  hasAccounts: boolean;
  
  // Actions
  selectAccount: (pubkey: string) => Promise<void>;
  createNewAccount: () => void;
  useExistingAccount: () => void;
  
  // Utilities
  clearError: () => void;
  refresh: () => Promise<void>;
}

interface V3DiscoveryResult {
  linkedAccounts: LinkedAccount[];
  legacyProfile: LegacyProfile | null;
  recommendedAction: 'select' | 'create' | 'existing';
}
```

#### **3.2 Account Discovery Flow Integration**
```tsx
// Seamless integration after Firebase auth
function FirebaseAuthSuccess({ firebaseResult }: { firebaseResult: V3FirebaseResult }) {
  const { discoverAccounts, isDiscovering, linkedAccounts, hasAccounts, selectAccount } = useV3AccountDiscovery();
  const { onAuthSuccess } = useV3AuthState();
  
  useEffect(() => {
    if (firebaseResult.requiresAccountDiscovery) {
      discoverAccounts(firebaseResult.user);
    }
  }, [firebaseResult]);
  
  if (isDiscovering) {
    return <LoadingScreen message="Finding your Nostr accounts..." />;
  }
  
  if (hasAccounts) {
    return (
      <AccountDiscoveryScreen
        linkedAccounts={linkedAccounts}
        onSelectAccount={selectAccount}
        onCreateNew={() => navigate('/create-account')}
      />
    );
  }
  
  // No accounts found - offer creation options
  return <NoAccountsFoundScreen />;
}
```

#### **3.3 Create useV3AccountLinking Hook**
**Purpose**: Account linking operations designed for v3 flows

**API Design**:
```tsx
interface UseV3AccountLinkingResult {
  // Linking operations
  linkAccount: (firebaseUser: FirebaseUser, pubkey: string) => Promise<void>;
  unlinkAccount: (pubkey: string) => Promise<void>;
  autoLink: (firebaseUser: FirebaseUser, nostrResult: V3NostrResult) => Promise<V3LinkResult>;
  
  // State
  isLinking: boolean;
  error: string | null;
  
  // Status
  linkingStatus: 'idle' | 'linking' | 'success' | 'error';
  
  // Utilities
  clearError: () => void;
  canLink: (firebaseUser: FirebaseUser, pubkey: string) => boolean;
}

interface V3LinkResult {
  success: boolean;
  linkedAccounts: LinkedAccount[];
  primaryAccount: string;
}
```

### Phase 4: Enhanced Error Handling & Recovery (Week 4)
**Goal**: Comprehensive error handling with user-friendly recovery options

#### **4.1 Create useV3ErrorRecovery Hook**
**Purpose**: Centralized error recovery with retry logic

**API Design**:
```tsx
interface UseV3ErrorRecoveryResult {
  // Retry mechanism
  withRetry: <T>(operation: () => Promise<T>, options?: RetryOptions) => Promise<T>;
  
  // State
  retryCount: number;
  canRetry: boolean;
  isRetrying: boolean;
  
  // Manual retry
  retry: () => Promise<void>;
  reset: () => void;
  
  // Error categorization  
  categorizeError: (error: unknown) => 'network' | 'validation' | 'authentication' | 'unknown';
  getRecoveryAction: (error: unknown) => 'retry' | 'fallback' | 'contact-support';
}

interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  retryOn?: (error: unknown) => boolean;
}
```

#### **4.2 Enhanced Error Display Components**
```tsx
// Smart error alerts with recovery actions
function V3ErrorAlert({ error, onRetry, onFallback }: V3ErrorAlertProps) {
  const { categorizeError, getRecoveryAction } = useV3ErrorRecovery();
  
  const errorType = categorizeError(error);
  const recoveryAction = getRecoveryAction(error);
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {error.message}
        <div className="flex gap-2 mt-2">
          {recoveryAction === 'retry' && (
            <Button size="sm" onClick={onRetry}>Try Again</Button>
          )}
          {recoveryAction === 'fallback' && (
            <Button size="sm" variant="outline" onClick={onFallback}>Use Different Method</Button>
          )}
          {recoveryAction === 'contact-support' && (
            <Button size="sm" variant="outline" onClick={() => window.open('/support')}>Get Help</Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

### Phase 5: Performance & UX Optimization (Week 5)
**Goal**: Optimize performance and enhance user experience

#### **5.1 Smart Loading States**
```tsx
// Coordinated loading with skeleton screens
function useV3LoadingStates() {
  return {
    // Granular loading states
    auth: { firebase: boolean, nostr: boolean, linking: boolean },
    
    // Smart loading messages
    getLoadingMessage: (operation: string) => string,
    
    // Skeleton screen helpers
    shouldShowSkeleton: (operation: string) => boolean,
    getSkeletonType: (operation: string) => 'form' | 'list' | 'profile'
  };
}
```

#### **5.2 Smart Defaults & Preferences**
```tsx
// User preference learning
function useV3UserPreferences() {
  return {
    // Remember successful auth methods
    preferredNostrMethod: 'extension' | 'nsec' | 'bunker',
    rememberChoice: (method: string) => void,
    
    // Smart method ordering
    getMethodOrder: () => NostrMethod[],
    
    // Quick auth shortcuts
    hasQuickAuth: boolean,
    quickAuth: () => Promise<void>
  };
}
```

### Phase 6: Testing & Documentation (Week 6)
**Goal**: Ensure reliability and maintainability

#### **6.1 Comprehensive Testing Strategy**
```tsx
// Hook testing pattern
describe('useV3FirebaseAuth', () => {
  test('signIn success flow', async () => {
    const { result } = renderHook(() => useV3FirebaseAuth());
    
    const signInResult = await act(async () => {
      return result.current.signIn('test@example.com', 'password');
    });
    
    expect(signInResult.user).toBeDefined();
    expect(signInResult.isNewUser).toBe(false);
  });
  
  test('error handling', async () => {
    // Test error scenarios
  });
});
```

#### **6.2 Integration Testing**
```tsx
// Component integration tests
describe('AuthFlow Integration', () => {
  test('complete signup flow', async () => {
    render(<AuthFlow />);
    
    // Test full user journey
    await userEvent.click(screen.getByText('Get Started'));
    await userEvent.click(screen.getByText('Artist'));
    // ... continue through full flow
    
    expect(screen.getByText('Welcome to Wavlake!')).toBeInTheDocument();
  });
});
```

## 🎯 Success Metrics

### Performance Targets
- Authentication completion rate: **> 95%**
- Error rate: **< 5%**  
- Average auth time: **< 10 seconds**
- Time to first interaction: **< 2 seconds**

### User Experience Targets
- User satisfaction score: **> 4.5/5**
- Support tickets for auth issues: **< 2% of signups**
- Conversion rate from signup start to completion: **> 80%**

### Technical Targets
- Test coverage: **> 90%**
- TypeScript strict mode: **100%**
- Zero critical security vulnerabilities
- Performance budget: **< 100kb for auth bundle**

## 🛠️ Development Guidelines

### Hook Design Principles
1. **Single Responsibility**: Each hook has one clear purpose
2. **Predictable APIs**: Consistent patterns across all hooks
3. **Error First**: Always handle errors gracefully
4. **Performance**: Optimize for common use cases
5. **Type Safety**: Full TypeScript coverage

### Component Integration Patterns
1. **Pure Components**: Components receive data and callbacks as props
2. **Local Error Handling**: Handle errors close to where they occur
3. **Loading States**: Always show loading states for async operations
4. **Accessibility**: Full keyboard navigation and screen reader support

### Testing Strategy
1. **Unit Tests**: All hooks must have comprehensive unit tests
2. **Integration Tests**: Test complete user flows
3. **Error Scenarios**: Test all error conditions
4. **Performance Tests**: Ensure hooks don't cause performance issues

## 📋 Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Create useV3FirebaseAuth hook
- [ ] Create useV3NostrAuth hook  
- [ ] Create useV3AuthState hook
- [ ] Write comprehensive tests for all hooks
- [ ] Create hook documentation and examples

### Phase 2: Integration ✅
- [ ] Integrate useV3FirebaseAuth into FirebaseAuthForm
- [ ] Integrate useV3NostrAuth into NostrAuthForm
- [ ] Integrate useV3AuthState into AuthFlow
- [ ] Test integration with existing components
- [ ] Update component documentation

### Phase 3: Account Discovery ✅
- [ ] Create useV3AccountDiscovery hook
- [ ] Create useV3AccountLinking hook
- [ ] Integrate account discovery into Firebase auth flow
- [ ] Add account linking capabilities
- [ ] Test complete linking workflows

### Phase 4: Error Handling ✅
- [ ] Create useV3ErrorRecovery hook
- [ ] Implement enhanced error display components
- [ ] Add retry logic to all auth operations
- [ ] Create fallback authentication paths
- [ ] Test error recovery scenarios

### Phase 5: Optimization ✅
- [ ] Implement smart loading states
- [ ] Add user preference learning
- [ ] Optimize performance and bundle size
- [ ] Add analytics and monitoring
- [ ] Conduct user testing

### Phase 6: Testing & Docs ✅
- [ ] Complete test coverage for all components
- [ ] Add integration tests for complete flows
- [ ] Update all documentation
- [ ] Create troubleshooting guides
- [ ] Performance audit and optimization

## 🔄 Migration Strategy

### From Current V3 to Enhanced V3
1. **Gradual Migration**: Replace hooks one component at a time
2. **Feature Flags**: Use feature flags to enable new hooks gradually
3. **A/B Testing**: Compare old vs new authentication flows
4. **Rollback Plan**: Maintain ability to rollback to current implementation
5. **User Communication**: Inform users of improvements and changes

### Timeline
- **Week 1-2**: Foundation and core integration
- **Week 3-4**: Account discovery and error handling  
- **Week 5-6**: Optimization and testing
- **Week 7**: Documentation and rollout planning
- **Week 8**: Gradual rollout with monitoring

This plan creates a modern, maintainable authentication system that builds on v3's strengths while addressing all current limitations through fresh, purpose-built hooks designed specifically for the v3 component architecture.