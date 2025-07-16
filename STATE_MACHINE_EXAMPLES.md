# State Machine Implementation Examples

This document provides concrete examples of how to implement the Promise-Based State Machine pattern for the auth refactor.

## Base State Machine Pattern

### Types and Interfaces

```typescript
// src/hooks/auth/machines/types.ts

// Base interfaces that all state machines extend
export interface BaseStateMachineState {
  step: string;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
  canGoBack: boolean;
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type AsyncActionHandler<TArgs extends any[] = any[], TResult = any> = 
  (...args: TArgs) => Promise<ActionResult<TResult>>;

// Base action types that all state machines use
export interface BaseStateMachineAction {
  type: string;
}

export interface AsyncStartAction extends BaseStateMachineAction {
  type: "ASYNC_START";
  operation: string;
}

export interface AsyncSuccessAction<T = any> extends BaseStateMachineAction {
  type: "ASYNC_SUCCESS";
  operation: string;
  data?: T;
}

export interface AsyncErrorAction extends BaseStateMachineAction {
  type: "ASYNC_ERROR";
  operation: string;
  error: string;
}

export interface ResetAction extends BaseStateMachineAction {
  type: "RESET";
}

export interface GoBackAction extends BaseStateMachineAction {
  type: "GO_BACK";
}
```

### Utility Functions

```typescript
// src/hooks/auth/utils/stateMachineUtils.ts

import { BaseStateMachineState, ActionResult } from '../machines/types';

// Helper to create async action wrapper
export function createAsyncAction<TArgs extends any[], TResult>(
  operation: string,
  asyncFn: (...args: TArgs) => Promise<TResult>,
  dispatch: React.Dispatch<any>
): AsyncActionHandler<TArgs, TResult> {
  return async (...args: TArgs): Promise<ActionResult<TResult>> => {
    dispatch({ type: "ASYNC_START", operation });
    
    try {
      const result = await asyncFn(...args);
      dispatch({ type: "ASYNC_SUCCESS", operation, data: result });
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "ASYNC_ERROR", operation, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  };
}

// Helper to check if operation is loading
export function isOperationLoading(state: BaseStateMachineState, operation: string): boolean {
  return state.isLoading[operation] ?? false;
}

// Helper to get operation error
export function getOperationError(state: BaseStateMachineState, operation: string): string | null {
  return state.errors[operation] ?? null;
}

// Helper to handle base actions (async start/success/error, reset, go back)
export function handleBaseActions<TState extends BaseStateMachineState>(
  state: TState,
  action: any
): Partial<TState> | null {
  switch (action.type) {
    case "ASYNC_START":
      return {
        ...state,
        isLoading: { ...state.isLoading, [action.operation]: true },
        errors: { ...state.errors, [action.operation]: null },
      };
    
    case "ASYNC_SUCCESS":
      return {
        ...state,
        isLoading: { ...state.isLoading, [action.operation]: false },
      };
    
    case "ASYNC_ERROR":
      return {
        ...state,
        isLoading: { ...state.isLoading, [action.operation]: false },
        errors: { ...state.errors, [action.operation]: action.error },
      };
    
    case "RESET":
      // Return null to indicate this should be handled by specific reducer
      return null;
    
    case "GO_BACK":
      // Return null to indicate this should be handled by specific reducer
      return null;
    
    default:
      return null;
  }
}
```

## Complete Signup State Machine Example

```typescript
// src/hooks/auth/machines/useSignupStateMachine.ts

import { useReducer, useCallback, useMemo } from 'react';
import { createAsyncAction, handleBaseActions, isOperationLoading, getOperationError } from '../utils/stateMachineUtils';
import { ActionResult } from './types';

// Types specific to signup flow
export type SignupStep = 
  | "user-type"
  | "artist-type"  
  | "profile-setup"
  | "firebase-backup"
  | "complete";

export interface SignupState {
  step: SignupStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
  canGoBack: boolean;
  account: any | null; // Replace with proper type
}

export type SignupAction = 
  | { type: "SET_USER_TYPE"; isArtist: boolean }
  | { type: "SET_ARTIST_TYPE"; isSolo: boolean }
  | { type: "PROFILE_COMPLETED" }
  | { type: "FIREBASE_BACKUP_COMPLETED" }
  | { type: "ASYNC_START"; operation: string }
  | { type: "ASYNC_SUCCESS"; operation: string; data?: any }
  | { type: "ASYNC_ERROR"; operation: string; error: string }
  | { type: "GO_BACK" }
  | { type: "RESET" };

const initialState: SignupState = {
  step: "user-type",
  isArtist: false,
  isSoloArtist: true,
  isLoading: {},
  errors: {},
  canGoBack: false,
  account: null,
};

function signupReducer(state: SignupState, action: SignupAction): SignupState {
  // Handle base async actions first
  const baseResult = handleBaseActions(state, action);
  if (baseResult) {
    return baseResult as SignupState;
  }

  switch (action.type) {
    case "SET_USER_TYPE":
      return {
        ...state,
        isArtist: action.isArtist,
        step: action.isArtist ? "artist-type" : "profile-setup",
        canGoBack: true,
      };

    case "SET_ARTIST_TYPE":
      return {
        ...state,
        isSoloArtist: action.isSolo,
        step: "profile-setup",
        canGoBack: true,
      };

    case "PROFILE_COMPLETED":
      return {
        ...state,
        step: state.isArtist ? "firebase-backup" : "complete",
        canGoBack: state.isArtist,
      };

    case "FIREBASE_BACKUP_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "GO_BACK":
      const previousStep = getPreviousStep(state.step, state.isArtist);
      return {
        ...state,
        step: previousStep,
        canGoBack: previousStep !== "user-type",
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

function getPreviousStep(currentStep: SignupStep, isArtist: boolean): SignupStep {
  switch (currentStep) {
    case "artist-type":
      return "user-type";
    case "profile-setup":
      return isArtist ? "artist-type" : "user-type";
    case "firebase-backup":
      return "profile-setup";
    default:
      return "user-type";
  }
}

// Hook interface
export interface UseSignupStateMachineResult {
  // State
  step: SignupStep;
  isArtist: boolean;
  isSoloArtist: boolean;
  canGoBack: boolean;
  account: any | null;
  
  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => string | null;
  
  // Promise-based actions
  actions: {
    setUserType: (isArtist: boolean) => Promise<ActionResult>;
    setArtistType: (isSolo: boolean) => Promise<ActionResult>;
    completeProfile: (profileData: any) => Promise<ActionResult>;
    setupFirebaseBackup: (email: string, password: string) => Promise<ActionResult>;
  };
  
  // Navigation
  goBack: () => void;
  reset: () => void;
}

export function useSignupStateMachine(
  dependencies: {
    createAccount: () => Promise<any>;
    saveProfile: (data: any) => Promise<void>;
    createFirebaseAccount: (email: string, password: string) => Promise<any>;
    linkAccounts: () => Promise<void>;
  }
): UseSignupStateMachineResult {
  const [state, dispatch] = useReducer(signupReducer, initialState);
  
  // Create async action handlers
  const setUserType = useMemo(() => 
    createAsyncAction("setUserType", async (isArtist: boolean) => {
      // Update state first
      dispatch({ type: "SET_USER_TYPE", isArtist });
      
      // For listeners, create account immediately
      if (!isArtist) {
        const account = await dependencies.createAccount();
        return { account };
      }
      
      return {};
    }, dispatch), [dependencies.createAccount]);

  const setArtistType = useMemo(() =>
    createAsyncAction("setArtistType", async (isSolo: boolean) => {
      // Update state first
      dispatch({ type: "SET_ARTIST_TYPE", isSolo });
      
      // Create account for profile setup
      const account = await dependencies.createAccount();
      return { account };
    }, dispatch), [dependencies.createAccount]);

  const completeProfile = useMemo(() =>
    createAsyncAction("completeProfile", async (profileData: any) => {
      await dependencies.saveProfile(profileData);
      dispatch({ type: "PROFILE_COMPLETED" });
      return {};
    }, dispatch), [dependencies.saveProfile]);

  const setupFirebaseBackup = useMemo(() =>
    createAsyncAction("setupFirebaseBackup", async (email: string, password: string) => {
      const firebaseUser = await dependencies.createFirebaseAccount(email, password);
      await dependencies.linkAccounts();
      dispatch({ type: "FIREBASE_BACKUP_COMPLETED" });
      return { firebaseUser };
    }, dispatch), [dependencies.createFirebaseAccount, dependencies.linkAccounts]);

  // Navigation helpers
  const goBack = useCallback(() => {
    if (state.canGoBack) {
      dispatch({ type: "GO_BACK" });
    }
  }, [state.canGoBack]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Loading and error helpers
  const isLoading = useCallback((operation: string) => 
    isOperationLoading(state, operation), [state]);
  
  const getError = useCallback((operation: string) => 
    getOperationError(state, operation), [state]);

  return {
    // State
    step: state.step,
    isArtist: state.isArtist,
    isSoloArtist: state.isSoloArtist,
    canGoBack: state.canGoBack,
    account: state.account,
    
    // Helpers
    isLoading,
    getError,
    
    // Actions
    actions: {
      setUserType,
      setArtistType,
      completeProfile,
      setupFirebaseBackup,
    },
    
    // Navigation
    goBack,
    reset,
  };
}
```

## Business Logic Hook Example

```typescript
// src/hooks/auth/flows/useSignupFlow.ts

import { useCallback } from 'react';
import { useSignupStateMachine } from '../machines/useSignupStateMachine';
import { useCreateNostrAccount } from '../useCreateNostrAccount';
import { useLinkAccount } from '../useLinkAccount';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';

export interface UseSignupFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useSignupStateMachine>;
  
  // Step-specific handlers
  handleUserTypeSelection: (isArtist: boolean) => Promise<void>;
  handleArtistTypeSelection: (isSolo: boolean) => Promise<void>;
  handleProfileCompletion: (profileData: any) => Promise<void>;
  handleFirebaseBackupSetup: (email: string, password: string) => Promise<void>;
  
  // Helper functions
  getStepTitle: () => string;
  getStepDescription: () => string;
  shouldShowFirebaseBackup: () => boolean;
}

export function useSignupFlow(): UseSignupFlowResult {
  // External dependencies
  const { createAccount } = useCreateNostrAccount();
  const { mutateAsync: linkAccounts } = useLinkAccount();
  const { registerWithEmailAndPassword } = useFirebaseAuth();
  
  // State machine with dependencies injected
  const stateMachine = useSignupStateMachine({
    createAccount,
    saveProfile: async (data: any) => {
      // Implementation for saving profile
      console.log("Saving profile:", data);
    },
    createFirebaseAccount: async (email: string, password: string) => {
      const result = await registerWithEmailAndPassword({ email, password });
      return result.user;
    },
    linkAccounts,
  });

  // Step handlers that integrate with UI
  const handleUserTypeSelection = useCallback(async (isArtist: boolean) => {
    const result = await stateMachine.actions.setUserType(isArtist);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleArtistTypeSelection = useCallback(async (isSolo: boolean) => {
    const result = await stateMachine.actions.setArtistType(isSolo);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleProfileCompletion = useCallback(async (profileData: any) => {
    const result = await stateMachine.actions.completeProfile(profileData);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleFirebaseBackupSetup = useCallback(async (email: string, password: string) => {
    const result = await stateMachine.actions.setupFirebaseBackup(email, password);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  // Helper functions for UI
  const getStepTitle = useCallback(() => {
    switch (stateMachine.step) {
      case "user-type":
        return "Welcome to Wavlake";
      case "artist-type":
        return "Artist Type";
      case "profile-setup":
        return stateMachine.isArtist ? "Create Artist Profile" : "Create Profile";
      case "firebase-backup":
        return "Add Email Backup";
      case "complete":
        return "Welcome!";
      default:
        return "";
    }
  }, [stateMachine.step, stateMachine.isArtist]);

  const getStepDescription = useCallback(() => {
    switch (stateMachine.step) {
      case "user-type":
        return "Choose how you want to use Wavlake";
      case "artist-type":
        return "Are you a solo artist or part of a band/group?";
      case "profile-setup":
        return "Set up your public profile";
      case "firebase-backup":
        return "Add an email to help recover your account if needed";
      case "complete":
        return "You're all set up!";
      default:
        return "";
    }
  }, [stateMachine.step]);

  const shouldShowFirebaseBackup = useCallback(() => {
    return stateMachine.isArtist;
  }, [stateMachine.isArtist]);

  return {
    stateMachine,
    handleUserTypeSelection,
    handleArtistTypeSelection,
    handleProfileCompletion,
    handleFirebaseBackupSetup,
    getStepTitle,
    getStepDescription,
    shouldShowFirebaseBackup,
  };
}
```

## Component Implementation Example

```typescript
// src/components/auth/flows/SignupFlow.tsx

import React from 'react';
import { useSignupFlow } from '@/hooks/auth/flows/useSignupFlow';
import { UserTypeStep } from '../steps/signup/UserTypeStep';
import { ArtistTypeStep } from '../steps/signup/ArtistTypeStep';
import { ProfileSetupStep } from '../steps/signup/ProfileSetupStep';
import { FirebaseBackupStep } from '../steps/signup/FirebaseBackupStep';
import { CompleteStep } from '../steps/shared/CompleteStep';
import { StepWrapper } from '../ui/StepWrapper';

interface SignupFlowProps {
  onComplete: (result: any) => void;
  onCancel?: () => void;
}

export function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
  const {
    stateMachine,
    handleUserTypeSelection,
    handleArtistTypeSelection,
    handleProfileCompletion,
    handleFirebaseBackupSetup,
    getStepTitle,
    getStepDescription,
  } = useSignupFlow();

  const handleStepComplete = async () => {
    if (stateMachine.step === "complete") {
      onComplete({ success: true });
    }
  };

  const renderCurrentStep = () => {
    switch (stateMachine.step) {
      case "user-type":
        return (
          <UserTypeStep
            onComplete={handleUserTypeSelection}
            isLoading={stateMachine.isLoading("setUserType")}
            error={stateMachine.getError("setUserType")}
          />
        );

      case "artist-type":
        return (
          <ArtistTypeStep
            onComplete={handleArtistTypeSelection}
            isLoading={stateMachine.isLoading("setArtistType")}
            error={stateMachine.getError("setArtistType")}
          />
        );

      case "profile-setup":
        return (
          <ProfileSetupStep
            onComplete={handleProfileCompletion}
            isLoading={stateMachine.isLoading("completeProfile")}
            error={stateMachine.getError("completeProfile")}
            isArtist={stateMachine.isArtist}
            isSoloArtist={stateMachine.isSoloArtist}
          />
        );

      case "firebase-backup":
        return (
          <FirebaseBackupStep
            onComplete={handleFirebaseBackupSetup}
            onSkip={() => handleStepComplete()}
            isLoading={stateMachine.isLoading("setupFirebaseBackup")}
            error={stateMachine.getError("setupFirebaseBackup")}
          />
        );

      case "complete":
        return (
          <CompleteStep
            title="Welcome to Wavlake!"
            description="Your account has been created successfully."
            onContinue={() => onComplete({ success: true })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <StepWrapper
      title={getStepTitle()}
      description={getStepDescription()}
      canGoBack={stateMachine.canGoBack}
      onBack={stateMachine.goBack}
      onCancel={onCancel}
      currentStep={stateMachine.step}
      totalSteps={stateMachine.isArtist ? 4 : 2}
    >
      {renderCurrentStep()}
    </StepWrapper>
  );
}
```

## Step Component Example

```typescript
// src/components/auth/steps/signup/UserTypeStep.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MicIcon, HeadphonesIcon, AlertCircle } from 'lucide-react';

interface UserTypeStepProps {
  onComplete: (isArtist: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function UserTypeStep({ onComplete, isLoading, error }: UserTypeStepProps) {
  const handleSelectArtist = async () => {
    try {
      await onComplete(true);
    } catch (err) {
      // Error is handled by the state machine
      console.error("Failed to select artist:", err);
    }
  };

  const handleSelectListener = async () => {
    try {
      await onComplete(false);
    } catch (err) {
      // Error is handled by the state machine
      console.error("Failed to select listener:", err);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSelectArtist}
        disabled={isLoading}
        variant="outline"
        className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors"
        size="lg"
      >
        <div className="flex items-center gap-3 w-full">
          <MicIcon className="w-5 h-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-base">Artist</div>
            <div className="text-sm text-muted-foreground mt-1">
              Share your music and connect with fans
            </div>
          </div>
        </div>
      </Button>

      <Button
        onClick={handleSelectListener}
        disabled={isLoading}
        variant="outline"
        className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors"
        size="lg"
      >
        <div className="flex items-center gap-3 w-full">
          <HeadphonesIcon className="w-5 h-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-base">Listener</div>
            <div className="text-sm text-muted-foreground mt-1">
              Discover and support your favorite artists
            </div>
          </div>
        </div>
      </Button>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Creating your account...
        </div>
      )}
    </div>
  );
}
```

## Testing Example

```typescript
// src/hooks/auth/machines/__tests__/useSignupStateMachine.test.ts

import { renderHook, act } from '@testing-library/react';
import { useSignupStateMachine } from '../useSignupStateMachine';

// Mock dependencies
const mockDependencies = {
  createAccount: jest.fn(),
  saveProfile: jest.fn(),
  createFirebaseAccount: jest.fn(),
  linkAccounts: jest.fn(),
};

describe('useSignupStateMachine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDependencies.createAccount.mockResolvedValue({ id: 'test-account' });
    mockDependencies.saveProfile.mockResolvedValue(undefined);
    mockDependencies.createFirebaseAccount.mockResolvedValue({ uid: 'test-user' });
    mockDependencies.linkAccounts.mockResolvedValue(undefined);
  });

  it('starts with user-type step', () => {
    const { result } = renderHook(() => useSignupStateMachine(mockDependencies));
    
    expect(result.current.step).toBe('user-type');
    expect(result.current.canGoBack).toBe(false);
  });

  it('handles artist selection correctly', async () => {
    const { result } = renderHook(() => useSignupStateMachine(mockDependencies));
    
    await act(async () => {
      const actionResult = await result.current.actions.setUserType(true);
      expect(actionResult.success).toBe(true);
    });
    
    expect(result.current.step).toBe('artist-type');
    expect(result.current.isArtist).toBe(true);
    expect(result.current.canGoBack).toBe(true);
  });

  it('handles listener selection correctly', async () => {
    const { result } = renderHook(() => useSignupStateMachine(mockDependencies));
    
    await act(async () => {
      const actionResult = await result.current.actions.setUserType(false);
      expect(actionResult.success).toBe(true);
    });
    
    expect(result.current.step).toBe('profile-setup');
    expect(result.current.isArtist).toBe(false);
    expect(mockDependencies.createAccount).toHaveBeenCalled();
  });

  it('handles async errors correctly', async () => {
    mockDependencies.createAccount.mockRejectedValue(new Error('Account creation failed'));
    
    const { result } = renderHook(() => useSignupStateMachine(mockDependencies));
    
    await act(async () => {
      const actionResult = await result.current.actions.setUserType(false);
      expect(actionResult.success).toBe(false);
      expect(actionResult.error).toBe('Account creation failed');
    });
    
    expect(result.current.getError('setUserType')).toBe('Account creation failed');
  });

  it('handles navigation correctly', () => {
    const { result } = renderHook(() => useSignupStateMachine(mockDependencies));
    
    // Move to artist-type step
    act(() => {
      result.current.actions.setUserType(true);
    });
    
    expect(result.current.step).toBe('artist-type');
    expect(result.current.canGoBack).toBe(true);
    
    // Go back
    act(() => {
      result.current.goBack();
    });
    
    expect(result.current.step).toBe('user-type');
    expect(result.current.canGoBack).toBe(false);
  });
});
```

This pattern provides a robust, testable, and maintainable approach to managing complex authentication flows with clear separation between state management, business logic, and UI components.