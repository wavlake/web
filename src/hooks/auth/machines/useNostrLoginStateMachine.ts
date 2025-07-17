/**
 * Nostr Login State Machine
 * 
 * Manages the state for direct Nostr authentication flow.
 * This is the simplest flow with just auth and complete steps.
 */

import { useReducer, useCallback, useMemo } from 'react';
import { createAsyncAction, handleBaseActions, isOperationLoading, getOperationError } from '../utils/stateMachineUtils';
import { ActionResult, NostrLoginState, NostrLoginAction, NostrLoginStep } from './types';

// Export types that are imported elsewhere
export type { NostrLoginState, NostrLoginAction, NostrLoginStep };
import { NostrAuthMethod, NostrCredentials } from '@/types/authFlow';

const initialState: NostrLoginState = {
  step: "auth",
  isLoading: {},
  errors: {},
  canGoBack: false,
};

function nostrLoginReducer(state: NostrLoginState, action: NostrLoginAction): NostrLoginState {
  // Handle base async actions first
  const baseResult = handleBaseActions(state, action);
  if (baseResult) {
    return baseResult as NostrLoginState;
  }

  switch (action.type) {
    case "AUTH_COMPLETED":
      return {
        ...state,
        step: "complete",
        canGoBack: false,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Hook interface
export interface UseNostrLoginStateMachineResult {
  // State
  step: NostrLoginStep;
  canGoBack: boolean;
  
  // Loading helpers
  isLoading: (operation: string) => boolean;
  getError: (operation: string) => Error | null;
  
  // Promise-based actions
  actions: {
    authenticateWithNostr: (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<ActionResult>;
  };
  
  // Navigation
  reset: () => void;
}

export interface NostrLoginStateMachineDependencies {
  authenticate: (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<unknown>;
  syncProfile: () => Promise<void>;
}

export function useNostrLoginStateMachine(
  dependencies: NostrLoginStateMachineDependencies
): UseNostrLoginStateMachineResult {
  const [state, dispatch] = useReducer(nostrLoginReducer, initialState);
  
  // Create async action handlers
  const authenticateWithNostr = useMemo(() => 
    createAsyncAction("authenticateWithNostr", async (method: NostrAuthMethod, credentials: NostrCredentials) => {
      // Authenticate with chosen method
      const authResult = await dependencies.authenticate(method, credentials);
      
      // Sync profile
      await dependencies.syncProfile();
      
      // Complete flow
      dispatch({ type: "AUTH_COMPLETED" });
      
      return { authResult };
    }, dispatch), [dependencies]);

  // Navigation helpers
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
    canGoBack: state.canGoBack,
    
    // Helpers
    isLoading,
    getError,
    
    // Actions
    actions: {
      authenticateWithNostr,
    },
    
    // Navigation
    reset,
  };
}