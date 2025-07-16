# Auth Refactor Implementation Checklist

This checklist tracks the implementation progress of the auth state machine refactor.

## Phase 1: Foundation (Days 1-3)

### Day 1: Core Infrastructure ⏳

#### File Structure Setup
- [ ] Create `src/hooks/auth/machines/` directory
- [ ] Create `src/hooks/auth/flows/` directory  
- [ ] Create `src/hooks/auth/utils/` directory
- [ ] Create `src/components/auth/flows/` directory
- [ ] Create `src/components/auth/steps/signup/` directory
- [ ] Create `src/components/auth/steps/legacy/` directory
- [ ] Create `src/components/auth/steps/shared/` directory
- [ ] Create `src/components/auth/ui/` directory

#### Base Utilities & Types
- [ ] Create `src/hooks/auth/machines/types.ts` - Shared types and interfaces
- [ ] Create `src/hooks/auth/utils/stateMachineUtils.ts` - Common state machine utilities
- [ ] Create `src/hooks/auth/utils/authHelpers.ts` - Auth helper functions
- [ ] Create `src/types/authFlow.ts` - Updated auth flow types
- [ ] Update `src/hooks/auth/index.ts` - New export structure

#### Testing Infrastructure
- [ ] Set up Jest test files for state machines
- [ ] Create test utilities for mocking async operations
- [ ] Set up React Testing Library for component tests
- [ ] Create example tests for state machine pattern

### Day 2: Signup State Machine ⏳

#### State Machine Implementation
- [ ] Create `src/hooks/auth/machines/useSignupStateMachine.ts`
- [ ] Implement signup state interface and types
- [ ] Create signup reducer with all transitions
- [ ] Implement promise-based action handlers
- [ ] Add loading and error state management

#### Business Logic Hook
- [ ] Create `src/hooks/auth/flows/useSignupFlow.ts`
- [ ] Integrate with existing account creation logic
- [ ] Handle profile creation and Firebase backup
- [ ] Implement proper error handling and recovery

#### Step Components
- [ ] Create `src/components/auth/steps/signup/UserTypeStep.tsx`
- [ ] Create `src/components/auth/steps/signup/ArtistTypeStep.tsx` 
- [ ] Create `src/components/auth/steps/signup/ProfileSetupStep.tsx`
- [ ] Create `src/components/auth/steps/signup/FirebaseBackupStep.tsx`

#### Flow Component
- [ ] Create `src/components/auth/flows/SignupFlow.tsx`
- [ ] Integrate state machine with step components
- [ ] Implement navigation and error handling
- [ ] Add loading states and progress indicators

### Day 3: Simple Nostr Login ⏳

#### State Machine Implementation
- [ ] Create `src/hooks/auth/machines/useNostrLoginStateMachine.ts`
- [ ] Implement simple two-state machine (auth -> complete)
- [ ] Add promise-based auth action
- [ ] Handle loading and error states

#### Business Logic Hook
- [ ] Create `src/hooks/auth/flows/useNostrLoginFlow.ts`
- [ ] Integrate existing NostrAuthForm logic
- [ ] Handle profile sync after authentication
- [ ] Implement navigation after completion

#### Components
- [ ] Create `src/components/auth/steps/shared/NostrAuthStep.tsx`
- [ ] Create `src/components/auth/flows/NostrLoginFlow.tsx`
- [ ] Test simple authentication flow
- [ ] Verify profile sync and navigation

## Phase 2: Complex Flows (Days 4-7)

### Day 4-5: Legacy Migration State Machine ⏳

#### State Machine Implementation
- [ ] Create `src/hooks/auth/machines/useLegacyMigrationStateMachine.ts`
- [ ] Implement complex multi-step state interface
- [ ] Create reducer handling all legacy migration paths
- [ ] Implement promise-based actions for each step
- [ ] Add sophisticated loading and error state management

#### Business Logic Hook - Part 1
- [ ] Create `src/hooks/auth/flows/useLegacyMigrationFlow.ts`
- [ ] Implement Firebase authentication logic
- [ ] Add pubkey checking and linking detection
- [ ] Handle conditional routing based on linked accounts

#### Business Logic Hook - Part 2
- [ ] Implement account generation logic
- [ ] Add bring-your-own-keypair logic
- [ ] Handle account linking process
- [ ] Add error recovery for each step

### Day 6: Legacy Migration Components ⏳

#### Step Components - Authentication
- [ ] Create `src/components/auth/steps/legacy/FirebaseAuthStep.tsx`
- [ ] Create `src/components/auth/steps/legacy/CheckingLinksStep.tsx`
- [ ] Create `src/components/auth/steps/legacy/LinkedNostrAuthStep.tsx`

#### Step Components - Account Setup
- [ ] Create `src/components/auth/steps/legacy/AccountChoiceStep.tsx`
- [ ] Create `src/components/auth/steps/legacy/AccountGenerationStep.tsx`
- [ ] Create `src/components/auth/steps/legacy/BringKeypairStep.tsx`

#### UI Components
- [ ] Create `src/components/auth/ui/FlowHeader.tsx`
- [ ] Create `src/components/auth/ui/StepWrapper.tsx`
- [ ] Create `src/components/auth/ui/ProgressIndicator.tsx`
- [ ] Create `src/components/auth/steps/shared/LoadingStep.tsx`

### Day 7: Integration ⏳

#### Flow Components
- [ ] Create `src/components/auth/flows/LegacyMigrationFlow.tsx`
- [ ] Integrate all legacy migration steps
- [ ] Implement complex navigation logic
- [ ] Add progress tracking and error boundaries

#### Main Router Update
- [ ] Update `src/pages/Login.tsx` to use new flow architecture
- [ ] Implement flow selection UI
- [ ] Add flow switching logic
- [ ] Remove old switch statement logic

#### Testing Integration
- [ ] Test all three flows independently
- [ ] Test flow switching
- [ ] Verify navigation and error handling
- [ ] Test edge cases and error scenarios

## Phase 3: Cleanup & Testing (Days 8-10)

### Day 8: Remove Legacy Code ⏳

#### Delete Old Files
- [ ] Remove `src/hooks/auth/useAuthFlowState.ts`
- [ ] Remove `src/hooks/auth/useAuthFlowCoordinator.ts`
- [ ] Remove `src/hooks/auth/useSignupFlow.ts` (old version)
- [ ] Remove `src/hooks/auth/useSigninFlow.ts` (old version)
- [ ] Remove any other deprecated auth hooks

#### Update Imports
- [ ] Update all imports in component files
- [ ] Update hook exports in `src/hooks/auth/index.ts`
- [ ] Update any references in other parts of the codebase
- [ ] Remove unused imports and dependencies

#### Clean Component Structure
- [ ] Remove old auth components that are no longer needed
- [ ] Update component exports
- [ ] Clean up any duplicate functionality
- [ ] Verify all new components are properly exported

### Day 9: Testing & Polish ⏳

#### Comprehensive Testing
- [ ] Write unit tests for all three state machines
- [ ] Create integration tests for each flow
- [ ] Test error scenarios and edge cases
- [ ] Add E2E tests for complete user journeys

#### Error Handling & UX
- [ ] Implement error boundaries for each flow
- [ ] Add comprehensive loading states
- [ ] Improve error messages and user feedback
- [ ] Test accessibility with screen readers

#### Performance & Polish
- [ ] Optimize re-renders and component performance
- [ ] Add smooth transitions and animations
- [ ] Implement proper focus management
- [ ] Test on different devices and browsers

### Day 10: Documentation & Deployment ⏳

#### Documentation Updates
- [ ] Update `docs/AUTHENTICATION.md` with new architecture
- [ ] Create developer guide for adding new auth steps
- [ ] Document state machine patterns and best practices
- [ ] Update component documentation

#### Final Testing & Deployment
- [ ] Performance testing and optimization
- [ ] Final security review
- [ ] Bundle size analysis and optimization
- [ ] Deploy to staging and production

#### Post-Launch Tasks
- [ ] Monitor for errors and user feedback
- [ ] Document any issues or improvements needed
- [ ] Plan future enhancements
- [ ] Create maintenance guide

---

## Daily Review Questions

At the end of each day, review:

1. **Completion**: What percentage of planned tasks were completed?
2. **Blockers**: What issues prevented completion of planned tasks?
3. **Quality**: Are the implemented features working as expected?
4. **Timeline**: Do we need to adjust the timeline for remaining days?
5. **Risk**: Are there any technical risks that need to be addressed?

---

## Success Criteria

### Technical Success
- [ ] All three state machines working independently
- [ ] No runtime errors in any flow
- [ ] Proper TypeScript coverage (no `any` types)
- [ ] Comprehensive test coverage (>80%)
- [ ] Performance meets or exceeds current implementation

### User Experience Success
- [ ] All authentication flows work smoothly
- [ ] Error handling provides clear guidance
- [ ] Loading states provide good feedback
- [ ] Navigation is intuitive and predictable
- [ ] Accessibility requirements are met

### Developer Experience Success
- [ ] Code is easier to understand and maintain
- [ ] Adding new steps is straightforward
- [ ] Debugging is improved with better error messages
- [ ] Testing is easier with isolated components
- [ ] Documentation is clear and comprehensive

---

**Progress Tracking**: Update this checklist daily to track completion status.
- ⏳ = In Progress
- ✅ = Completed  
- ❌ = Blocked/Issues
- ⏭️ = Skipped/Postponed