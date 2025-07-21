/**
 * Nostr Login State Machine
 * 
 * Manages the state for direct Nostr authentication flow.
 * This is the simplest flow with just auth and complete steps.
 * 
 * REFACTORED: Now uses shared authentication patterns and direct async actions
 */

import { useReducer, useCallback, useMemo } from 'react';
import { handleBaseActions, isOperationLoading, getOperationError, createAsyncAction } from '../utils/stateMachineUtils';
import { ActionResult, NostrLoginState, NostrLoginAction, NostrLoginStep } from './types';
import type { NostrLoginDependencies, NostrAuthMethod, NostrCredentials, AuthResult } from './sharedTypes';

// Export types that are imported elsewhere
export type { NostrLoginState, NostrLoginAction, NostrLoginStep };

const initialState: NostrLoginState = {
  step: "auth",
  authenticatedPubkey: null,
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
        authenticatedPubkey: action.pubkey,
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
  authenticatedPubkey: string | null;
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

// Use shared dependencies interface - composed from shared types
export interface NostrLoginStateMachineDependencies extends NostrLoginDependencies {}

export function useNostrLoginStateMachine(
  dependencies: NostrLoginStateMachineDependencies
): UseNostrLoginStateMachineResult {
  const [state, dispatch] = useReducer(nostrLoginReducer, initialState);
  
  // Create async action handlers using shared utilities
  const authenticateWithNostr = useMemo(() => {
    // Create custom action that includes profile sync within the async function
    // This ensures all errors (including sync errors) are handled by createAsyncAction
    return createAsyncAction(
      "authenticateWithNostr",
      async (method: NostrAuthMethod, credentials: NostrCredentials): Promise<AuthResult> => {
        // Step 1: Authenticate with chosen method using dependency
        const authResult = await dependencies.authenticate(method, credentials);
        
        // Extract pubkey from authentication result
        const pubkey = (authResult as any)?.pubkey || "";
        
        // Step 2: Add profile sync (specific to NostrLogin flow)
        if (dependencies.syncProfile) {
          await dependencies.syncProfile();
        }
        
        // Step 3: Dispatch completion action with pubkey
        dispatch({ type: "AUTH_COMPLETED", pubkey });
        
        return {
          pubkey,
          authMethod: method,
          profile: (authResult as any)?.profile
        };
      },
      dispatch
    );
  }, [dependencies]);

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
    authenticatedPubkey: state.authenticatedPubkey,
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