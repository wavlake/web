# Auth Flow Refactor: Three State Machines

## Overview

This document outlines the complete refactor of the authentication system from a monolithic state machine into three focused, maintainable state machines using the Promise-Based State Machine pattern.

## Goals

- **Maintainability**: Each auth flow is isolated and easier to reason about
- **Testability**: Individual state machines can be tested in isolation
- **Developer Experience**: Clear separation of concerns and predictable async handling
- **Performance**: Reduced complexity and better error handling

## Architecture Decision: Promise-Based State Machines

We're using a hybrid approach that combines:
- **Pure state machines** (useReducer) for state transitions
- **Promise-based actions** for side effects and async operations
- **No backwards compatibility** - complete rebuild for cleaner architecture

## Three State Machines

### 1. Signup State Machine
**Purpose**: New user onboarding and account creation
**Complexity**: Medium (profile setup, optional Firebase backup)

### 2. Nostr Login State Machine  
**Purpose**: Direct Nostr authentication
**Complexity**: Low (single auth step)

### 3. Legacy Migration State Machine
**Purpose**: Complex legacy account migration with multiple paths
**Complexity**: High (Firebase auth, pubkey linking, account generation options)

---

## Implementation Plan

### Phase 1: Foundation (Days 1-3)

#### Day 1: Core Infrastructure
- [ ] Create new file structure
- [ ] Implement base state machine utilities
- [ ] Create shared types and interfaces
- [ ] Set up testing infrastructure

#### Day 2: Signup State Machine
- [ ] Implement `useSignupStateMachine` hook
- [ ] Create signup reducer and actions
- [ ] Build `useSignupFlow` business logic hook
- [ ] Create individual step components

#### Day 3: Simple Nostr Login
- [ ] Implement `useNostrLoginStateMachine` hook  
- [ ] Create `useNostrLoginFlow` business logic hook
- [ ] Build `NostrLoginFlow` component
- [ ] Test simple auth path

### Phase 2: Complex Flows (Days 4-7)

#### Day 4-5: Legacy Migration State Machine
- [ ] Implement `useLegacyMigrationStateMachine` hook
- [ ] Create complex reducer with multiple paths
- [ ] Build `useLegacyMigrationFlow` business logic hook
- [ ] Handle pubkey checking and linking logic

#### Day 6: Legacy Migration Components
- [ ] Create all legacy migration step components
- [ ] Implement account choice UI
- [ ] Build account generation vs bring-your-own flow
- [ ] Add linking progress indicators

#### Day 7: Integration
- [ ] Create main flow router (`SignupFlow`, `NostrLoginFlow`, `LegacyMigrationFlow`)
- [ ] Update main `Login.tsx` to use new flows
- [ ] Implement flow selection UI

### Phase 3: Cleanup & Testing (Days 8-10)

#### Day 8: Remove Legacy Code
- [ ] Delete old auth flow files
- [ ] Remove `useAuthFlowCoordinator` and related hooks
- [ ] Update all imports throughout codebase
- [ ] Clean up unused components

#### Day 9: Testing & Polish
- [ ] Comprehensive testing of all three flows
- [ ] Error boundary implementation
- [ ] Loading states and animations
- [ ] Accessibility improvements

#### Day 10: Documentation & Deployment
- [ ] Update documentation
- [ ] Create migration guide for future developers
- [ ] Performance testing
- [ ] Deploy and validate

---

## File Structure

```
src/
├── hooks/auth/
│   ├── machines/
│   │   ├── useSignupStateMachine.ts
│   │   ├── useNostrLoginStateMachine.ts
│   │   ├── useLegacyMigrationStateMachine.ts
│   │   └── types.ts
│   ├── flows/
│   │   ├── useSignupFlow.ts
│   │   ├── useNostrLoginFlow.ts
│   │   └── useLegacyMigrationFlow.ts
│   ├── utils/
│   │   ├── stateMachineUtils.ts
│   │   └── authHelpers.ts
│   └── index.ts
│
├── components/auth/
│   ├── flows/
│   │   ├── SignupFlow.tsx
│   │   ├── NostrLoginFlow.tsx
│   │   └── LegacyMigrationFlow.tsx
│   ├── steps/
│   │   ├── signup/
│   │   │   ├── UserTypeStep.tsx
│   │   │   ├── ArtistTypeStep.tsx
│   │   │   ├── ProfileSetupStep.tsx
│   │   │   └── FirebaseBackupStep.tsx
│   │   ├── legacy/
│   │   │   ├── FirebaseAuthStep.tsx
│   │   │   ├── CheckingLinksStep.tsx
│   │   │   ├── LinkedNostrAuthStep.tsx
│   │   │   ├── AccountChoiceStep.tsx
│   │   │   ├── AccountGenerationStep.tsx
│   │   │   └── BringKeypairStep.tsx
│   │   └── shared/
│   │       ├── NostrAuthStep.tsx
│   │       └── LoadingStep.tsx
│   ├── ui/
│   │   ├── FlowHeader.tsx
│   │   ├── StepWrapper.tsx
│   │   └── ProgressIndicator.tsx
│   └── index.ts
│
├── pages/
│   └── Login.tsx (simplified router)
│
└── types/
    └── authFlow.ts (updated types)
```

---

## Detailed Implementation Specifications

### State Machine Pattern

Each state machine follows this pattern:

```typescript
// State interface
interface StateMachineState {
  step: StepType;
  // ... other state
  isLoading: Record<string, boolean>;  // Loading states for async ops
  errors: Record<string, string | null>; // Error states
}

// Action types
type StateMachineAction = 
  | { type: "STEP_TRANSITION"; step: StepType }
  | { type: "ASYNC_START"; operation: string }
  | { type: "ASYNC_SUCCESS"; operation: string; data?: any }
  | { type: "ASYNC_ERROR"; operation: string; error: string }
  | { type: "RESET" };

// Hook interface
interface StateMachineHook {
  // State
  step: StepType;
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => string | null;
  canGoBack: boolean;
  
  // Promise-based actions
  actions: {
    [actionName: string]: (...args: any[]) => Promise<ActionResult>;
  };
  
  // Utilities
  reset: () => void;
  goBack: () => void;
}

// Action result type
interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

### Signup State Machine Specification

```typescript
type SignupStep = 
  | "user-type"      // Artist vs Listener selection
  | "artist-type"    // Solo vs Band (if artist)  
  | "profile-setup"  // EditProfileForm
  | "firebase-backup" // Optional email backup
  | "complete";      // Success state

interface SignupState {
  step: SignupStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
  account: NostrAccount | null;
}

// Promise-based actions
const actions = {
  async setUserType(isArtist: boolean): Promise<ActionResult> {
    // 1. Update state
    // 2. If listener, create account immediately
    // 3. Return success/error
  },
  
  async setArtistType(isSolo: boolean): Promise<ActionResult> {
    // 1. Update state  
    // 2. Create account for profile setup
    // 3. Return success/error
  },
  
  async completeProfile(profileData: ProfileData): Promise<ActionResult> {
    // 1. Save profile
    // 2. Move to next step (firebase-backup or complete)
    // 3. Return success/error
  },
  
  async setupFirebaseBackup(email: string, password: string): Promise<ActionResult> {
    // 1. Create Firebase account
    // 2. Link to Nostr account
    // 3. Complete flow
    // 4. Return success/error
  }
};
```

### Nostr Login State Machine Specification

```typescript
type NostrLoginStep = 
  | "auth"      // NostrAuthForm (Extension/Nsec/Bunker)
  | "complete"; // Success state

interface NostrLoginState {
  step: NostrLoginStep;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

const actions = {
  async authenticateWithNostr(method: NostrAuthMethod, credentials: any): Promise<ActionResult> {
    // 1. Authenticate with chosen method
    // 2. Sync profile
    // 3. Complete flow
    // 4. Return success/error
  }
};
```

### Legacy Migration State Machine Specification

```typescript
type LegacyMigrationStep = 
  | "firebase-auth"     // Firebase email/password login
  | "checking-links"    // API call to check linked pubkeys
  | "linked-nostr-auth" // Login with specific linked Nostr account  
  | "account-choice"    // Choose: generate new OR bring own keypair
  | "account-generation" // Generate new Nostr account
  | "bring-own-keypair" // NostrAuthForm for existing keys
  | "linking"           // Link Firebase + Nostr accounts
  | "complete";         // Success state

interface LegacyMigrationState {
  step: LegacyMigrationStep;
  firebaseUser: FirebaseUser | null;
  linkedPubkeys: LinkedPubkey[];
  expectedPubkey: string | null;
  generatedAccount: NostrAccount | null;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

const actions = {
  async authenticateWithFirebase(email: string, password: string): Promise<ActionResult> {
    // 1. Firebase auth
    // 2. Check for linked pubkeys
    // 3. Route to appropriate next step
  },
  
  async authenticateWithLinkedNostr(credentials: any): Promise<ActionResult> {
    // 1. Verify matches expected pubkey
    // 2. Complete auth
    // 3. Navigate to app
  },
  
  async generateNewAccount(): Promise<ActionResult> {
    // 1. Generate Nostr account
    // 2. Link to Firebase
    // 3. Complete flow
  },
  
  async bringOwnKeypair(credentials: any): Promise<ActionResult> {
    // 1. Authenticate with provided keys
    // 2. Link to Firebase
    // 3. Complete flow
  }
};
```

---

## Component Specifications

### Flow Components

Each flow component is responsible for:
- Managing its state machine
- Handling business logic through flow hooks
- Rendering appropriate step components
- Managing navigation and completion

```typescript
// Example: SignupFlow.tsx
interface SignupFlowProps {
  onComplete: (result: AuthResult) => void;
  onCancel?: () => void;
}

function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
  const stateMachine = useSignupStateMachine();
  const businessLogic = useSignupFlow(stateMachine);
  
  const handleStepComplete = async (stepData: any) => {
    const result = await businessLogic.handleStepData(stateMachine.step, stepData);
    if (result.success && stateMachine.step === "complete") {
      onComplete(result);
    }
  };
  
  return (
    <StepWrapper 
      step={stateMachine.step}
      canGoBack={stateMachine.canGoBack}
      onBack={stateMachine.goBack}
      onCancel={onCancel}
    >
      {renderCurrentStep()}
    </StepWrapper>
  );
}
```

### Step Components

Each step component is responsible for:
- Rendering UI for specific step
- Local form state management
- Calling flow actions on completion
- Displaying loading/error states

```typescript
// Example: UserTypeStep.tsx
interface UserTypeStepProps {
  onComplete: (isArtist: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function UserTypeStep({ onComplete, isLoading, error }: UserTypeStepProps) {
  const handleSelectArtist = async () => {
    await onComplete(true);
  };
  
  const handleSelectListener = async () => {
    await onComplete(false);
  };
  
  return (
    <div className="space-y-4">
      {error && <Alert variant="destructive">{error}</Alert>}
      
      <Button 
        onClick={handleSelectArtist}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Creating account..." : "Artist"}
      </Button>
      
      <Button 
        onClick={handleSelectListener}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Creating account..." : "Listener"}
      </Button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests
- **State Machine Logic**: Test reducers and action creators
- **Business Logic**: Test flow hooks independently  
- **Components**: Test step components in isolation

### Integration Tests
- **Full Flow Testing**: Test complete authentication flows
- **Error Scenarios**: Test error handling and recovery
- **Navigation**: Test back/forward navigation

### E2E Tests
- **Happy Paths**: Test successful completion of each flow
- **User Journeys**: Test realistic user scenarios
- **Cross-Flow**: Test switching between flows

---

## Migration Strategy

Since we're not supporting backwards compatibility:

1. **Create new implementation** alongside old one
2. **Test thoroughly** in isolation
3. **Switch over** in single commit
4. **Delete old code** immediately after

### Rollback Plan
- Keep old auth code in separate commits
- Tag release before switch
- Have revert commit ready if needed

---

## Performance Considerations

### Bundle Size
- Tree-shake unused state machines
- Lazy load complex flow components
- Split auth bundle from main app

### Runtime Performance
- Minimize re-renders with careful state design
- Use React.memo for step components
- Implement proper loading states

### Memory Management
- Clean up state machine subscriptions
- Clear sensitive data on completion
- Implement proper error boundaries

---

## Security Considerations

### Private Key Handling
- Never store private keys in state
- Clear form data after use
- Use secure memory patterns

### API Security
- Validate all user inputs
- Implement proper error sanitization
- Use secure token handling

### State Protection
- Don't expose sensitive state in dev tools
- Implement proper error boundaries
- Validate state transitions

---

## Success Metrics

### Developer Experience
- [ ] Reduced time to understand auth flow
- [ ] Easier to add new auth steps
- [ ] Better debugging experience
- [ ] Improved test coverage

### User Experience  
- [ ] Faster authentication flows
- [ ] Better error messages
- [ ] Smoother transitions
- [ ] Reduced confusion

### Technical Metrics
- [ ] Reduced bundle size
- [ ] Better TypeScript coverage
- [ ] Fewer runtime errors
- [ ] Improved performance

---

## Timeline Summary

**Total Duration**: 10 days (2 weeks)

- **Phase 1** (Days 1-3): Foundation and simple flows
- **Phase 2** (Days 4-7): Complex flows and integration  
- **Phase 3** (Days 8-10): Cleanup, testing, and deployment

**Milestones**:
- Day 3: Basic auth working with new architecture
- Day 7: All flows implemented and integrated
- Day 10: Production ready with full testing

---

## Next Steps

1. **Review and approve** this plan
2. **Set up development environment** on this branch
3. **Begin Phase 1** implementation
4. **Daily check-ins** to track progress
5. **Adjust timeline** as needed based on complexity

---

*This refactor represents a fundamental improvement in the maintainability, testability, and developer experience of the authentication system. The investment in proper architecture will pay dividends in future development speed and reliability.*