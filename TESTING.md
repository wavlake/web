# Wavlake Authentication Testing Framework

## Overview

This document tracks the comprehensive testing strategy for Wavlake's authentication system, focusing on high-level integration tests that are easy to write and maintain, with a roadmap for more granular testing.

## 🎯 Testing Strategy

### Philosophy
- **Start High-Level**: Begin with integration tests that test complete user flows
- **Easy to Write**: Prioritize tests that provide maximum value with minimal setup
- **User-Focused**: Test from the user's perspective, not implementation details
- **Incremental**: Build testing infrastructure that supports both current and future needs

### Testing Pyramid
```
    🔺 E2E Tests (Few)
   🔺🔺 Integration Tests (Some) ← Starting Here
  🔺🔺🔺 Unit Tests (Many) ← Future Focus
```

## 📋 Current Implementation Status

### ✅ Phase 1: Foundation & High-Level Tests (COMPLETED)
- [x] Testing framework setup (Vitest + Testing Library)
- [x] Test utilities and mocks for auth system
- [x] Integration tests for complete auth flows (15 passing tests)
- [x] Coverage reporting with v8 provider and thresholds
- [x] CI integration with npm run ci pipeline

### 🔄 Phase 2: Component & Hook Testing (NEXT)
- [ ] Unit tests for auth hooks (`useCurrentUser`, `useSignupFlow`, etc.)
- [ ] Component tests for auth step components
- [ ] State machine testing utilities
- [ ] Mock Nostr and Firebase services

### 🚀 Phase 3: Advanced Testing (FUTURE)
- [ ] Visual regression testing for auth components
- [ ] Performance testing for auth flows
- [ ] Security testing (rate limiting, validation)
- [ ] Cross-browser compatibility testing

## 🧪 Test Categories

### 1. Integration Tests (HIGH PRIORITY)
**Goal**: Test complete user authentication journeys

**Test Scenarios**:
- ✅ New user signup flow (artist vs listener)
- ✅ Existing user login with different methods (extension, nsec, bunker)
- ✅ Legacy migration flow with Firebase account
- ✅ Account linking and unlinking
- ✅ Error handling and recovery flows

**Example Test**:
```typescript
describe('Authentication Flows Integration', () => {
  it('should complete artist signup flow end-to-end', async () => {
    // Test complete flow from landing to dashboard
  });
});
```

### 2. Hook Tests (MEDIUM PRIORITY)
**Goal**: Test authentication business logic in isolation

**Test Coverage**:
- State machine hooks (`useSignupStateMachine`, `useLegacyMigrationStateMachine`)
- Auth utility hooks (`useCurrentUser`, `useCreateNostrAccount`)
- API integration hooks (`useLegacyApi`, `useLinkAccount`)

**Example Test**:
```typescript
describe('useCurrentUser Hook', () => {
  it('should handle login and logout correctly', async () => {
    // Test hook behavior in isolation
  });
});
```

### 3. Component Tests (MEDIUM PRIORITY)
**Goal**: Test individual auth components

**Test Coverage**:
- Flow components (`SignupFlow`, `NostrLoginFlow`, `LegacyMigrationFlow`)
- Step components (`UserTypeStep`, `ProfileSetupStep`, etc.)
- Guard components (`FirebaseActionGuard`, `PubkeyMismatchAlert`)

### 4. Validation Tests (HIGH PRIORITY)
**Goal**: Test input validation and security measures

**Test Coverage**:
- Nostr key validation (`validateNsec`, `validateBunkerUri`)
- Email and password validation
- Input sanitization and rate limiting
- Error message formatting

## 🛠️ Testing Infrastructure

### Core Technologies
- **Test Runner**: Vitest (configured with React and TypeScript support)
- **Component Testing**: React Testing Library + Testing Library User Event
- **Test Environment**: jsdom for browser API simulation
- **Mocking**: Vitest mocks + MSW for API mocking
- **Coverage**: Vitest v8 coverage provider with thresholds
- **Assertions**: Vitest expect + Testing Library matchers

### Test Utilities

#### 1. Auth Test Provider
```typescript
// src/test/AuthTestProvider.tsx
export function AuthTestProvider({ children, initialAuth }: AuthTestProviderProps) {
  // Provides controlled auth state for testing
}
```

#### 2. Mock Services
```typescript
// src/test/mocks/nostrMocks.ts
export const mockNostrService = {
  query: jest.fn(),
  publish: jest.fn(),
  // ... other Nostr operations
};

// src/test/mocks/firebaseMocks.ts
export const mockFirebaseAuth = {
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  // ... other Firebase operations
};
```

#### 3. Test Factories
```typescript
// src/test/factories/authFactories.ts
export const createMockUser = (overrides?: Partial<NUser>) => ({
  pubkey: 'test-pubkey',
  signer: mockSigner,
  ...overrides,
});

export const createMockSignupState = (overrides?: Partial<SignupState>) => ({
  step: 'user-type',
  isArtist: false,
  isLoading: {},
  errors: {},
  ...overrides,
});
```

### Custom Matchers
```typescript
// src/test/matchers/authMatchers.ts
expect.extend({
  toBeAuthenticated(received) {
    // Custom matcher for auth state
  },
  toHaveValidNsec(received) {
    // Custom matcher for Nostr key validation
  },
});
```

## 📁 Test File Organization

```
/src/test/
├── __mocks__/                    # Global mocks
│   ├── nostr.ts                 # Nostr protocol mocks
│   ├── firebase.ts              # Firebase service mocks
│   └── localStorage.ts          # Browser API mocks
├── factories/                   # Test data factories
│   ├── authFactories.ts         # Auth-related test data
│   ├── userFactories.ts         # User profile test data
│   └── eventFactories.ts        # Nostr event test data
├── matchers/                    # Custom Jest matchers
│   ├── authMatchers.ts          # Auth-specific assertions
│   └── nostrMatchers.ts         # Nostr-specific assertions
├── providers/                   # Test providers and wrappers
│   ├── AuthTestProvider.tsx     # Controlled auth state
│   ├── NostrTestProvider.tsx    # Mock Nostr environment
│   └── RouterTestProvider.tsx   # Router setup for tests
├── utils/                       # Test utilities
│   ├── renderWithProviders.tsx  # Enhanced render function
│   ├── waitForAuth.ts          # Auth state waiting utilities
│   └── testHelpers.ts          # General test helpers
└── setup.ts                    # Test environment setup

/src/__tests__/                  # Test files (mirrors src structure)
├── integration/                 # High-level integration tests
│   ├── auth-flows.test.tsx     # Complete auth flow tests
│   ├── account-linking.test.tsx # Account linking scenarios
│   └── error-recovery.test.tsx  # Error handling tests
├── hooks/                       # Hook-specific tests
│   ├── auth/                   # Auth hook tests
│   └── useCurrentUser.test.ts  # Core auth hook tests
├── components/                  # Component tests
│   ├── auth/                   # Auth component tests
│   └── ui/                     # UI component tests
└── lib/                        # Utility function tests
    ├── validation.test.ts      # Input validation tests
    └── nip98Auth.test.ts      # NIP-98 auth tests
```

## 🚀 Getting Started

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test pattern
npm test -- --testNamePattern="signup flow"

# Run tests for specific file
npm test src/__tests__/integration/auth-flows.test.tsx
```

### Writing Your First Test
```typescript
// src/__tests__/integration/auth-flows.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils/renderWithProviders';
import { SignupFlow } from '@/components/auth/flows/SignupFlow';

describe('Signup Flow Integration', () => {
  it('should complete artist signup successfully', async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    
    renderWithProviders(
      <SignupFlow onComplete={onComplete} onCancel={jest.fn()} />
    );
    
    // User selects "Artist"
    await user.click(screen.getByText('Artist'));
    
    // User selects "Solo Artist"
    await user.click(screen.getByText('Solo Artist'));
    
    // Fill out profile form
    await user.type(screen.getByLabelText(/artist name/i), 'Test Artist');
    await user.click(screen.getByText('Continue'));
    
    // Skip Firebase backup
    await user.click(screen.getByText('Skip'));
    
    // Verify completion
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({ isArtist: true });
    });
  });
});
```

## 📊 Coverage Targets

### Initial Targets (Phase 1)
- **Integration Tests**: 100% of auth flows covered
- **Critical Paths**: Login, signup, account linking
- **Error Scenarios**: Major error paths tested

### Long-term Targets (Phases 2-3)
- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Function Coverage**: 90%+
- **Auth Components**: 95%+ coverage

## 🔧 Test Configuration

### Jest Configuration
```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/__tests__/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/hooks/auth/': {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },
};
```

## 🎯 Success Metrics

### Phase 1 Success Criteria
- [x] All auth flows have integration tests
- [x] Test suite runs in under 30 seconds
- [x] Tests catch real authentication bugs
- [x] CI/CD integration working
- [x] Developer adoption (easy to run and write tests)

### Quality Gates
- All tests must pass before merging
- No decrease in test coverage
- New auth features require tests
- Regular test maintenance and updates

## 📚 Testing Best Practices

### Do's ✅
- Test user behavior, not implementation details
- Use descriptive test names that explain the scenario
- Keep tests isolated and independent
- Mock external dependencies (Nostr relays, Firebase)
- Test both happy paths and error scenarios
- Use factories for consistent test data

### Don'ts ❌
- Don't test internal component state
- Don't couple tests to specific UI text (use labels/roles)
- Don't skip error scenario testing
- Don't mock what you own (your own components/hooks)
- Don't write tests that test the framework
- Don't ignore flaky tests

### Test Naming Convention
```typescript
// Pattern: should [expected behavior] when [scenario]
it('should redirect to dashboard when artist signup completes successfully', () => {});
it('should show validation error when invalid nsec is entered', () => {});
it('should retry authentication when network error occurs', () => {});
```

## 🗓️ Implementation Timeline

### Week 1: Foundation
- Set up testing framework and utilities
- Create basic integration tests for signup flow
- Establish CI integration

### Week 2: Core Flows
- Complete integration tests for all auth flows
- Add error scenario testing
- Create mock services and providers

### Week 3: Hook Testing
- Unit tests for core auth hooks
- State machine testing utilities
- Validation function tests

### Week 4: Polish & Documentation
- Component-level tests
- Test documentation and examples
- Performance and security testing

## 🔗 Related Documentation

- [Authentication Hooks Documentation](src/hooks/auth/CLAUDE.md)
- [Authentication Components Documentation](src/components/auth/CLAUDE.md)
- [Wavlake Hooks Documentation](src/hooks/CLAUDE.md)
- [Project Overview](CLAUDE.md)

---

## 📝 Change Log

### 2025-01-17 - Phase 1 Complete
- ✅ Created comprehensive testing strategy document
- ✅ Set up Vitest testing framework with React Testing Library
- ✅ Established test infrastructure with mock services and utilities
- ✅ Created 15 passing integration tests demonstrating framework functionality
- ✅ Configured coverage reporting with v8 provider and quality thresholds
- ✅ Integrated testing into CI pipeline (npm run ci includes test:run)
- ✅ Created simple test provider pattern for easy test setup

**Infrastructure Delivered:**
- Complete Vitest configuration with jsdom environment
- MSW server for API mocking
- Test setup with Nostr, localStorage, and sessionStorage mocks
- SimpleTestProvider for React Query and Router testing
- Coverage reporting with branch/function/line thresholds
- CI integration ensuring tests pass before deployment

---

**Next Steps**: Ready for Phase 2 - Unit tests for auth hooks and components as needed.