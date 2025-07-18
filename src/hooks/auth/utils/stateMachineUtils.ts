/**
 * State Machine Utilities
 * 
 * Helper functions for implementing the Promise-Based State Machine pattern
 * across all authentication flows.
 */

import React from 'react';
import { BaseStateMachineState, ActionResult, AsyncActionHandler, AsyncStartAction, AsyncSuccessAction, AsyncErrorAction, ResetAction, GoBackAction } from '../machines/types';

// Base action types for dispatch
type BaseAction = AsyncStartAction | AsyncSuccessAction | AsyncErrorAction | ResetAction | GoBackAction;

// Generic action interface for any action
interface GenericAction {
  type: string;
  operation?: string;
  data?: unknown;
  error?: Error;
  [key: string]: unknown;
}

// Helper to create async action wrapper
export function createAsyncAction<TArgs extends unknown[], TResult>(
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
      const errorObject = error instanceof Error ? error : new Error(String(error));
      dispatch({ type: "ASYNC_ERROR", operation, error: errorObject });
      return { success: false, error: errorObject };
    }
  };
}

// Helper to check if operation is loading
export function isOperationLoading(state: BaseStateMachineState, operation: string): boolean {
  return state.isLoading[operation] ?? false;
}

// Helper to get operation error
export function getOperationError(state: BaseStateMachineState, operation: string): Error | null {
  return state.errors[operation] ?? null;
}

// Helper to handle base actions (async start/success/error, reset, go back)
export function handleBaseActions<TState extends BaseStateMachineState>(
  state: TState,
  action: any
): Partial<TState> | null {
  switch (action.type) {
    case "ASYNC_START":
      if (action.operation) {
        return {
          ...state,
          isLoading: { ...state.isLoading, [action.operation]: true },
          errors: { ...state.errors, [action.operation]: null },
        };
      }
      return null;
    
    case "ASYNC_SUCCESS":
      if (action.operation) {
        return {
          ...state,
          isLoading: { ...state.isLoading, [action.operation]: false },
        };
      }
      return null;
    
    case "ASYNC_ERROR":
      if (action.operation && action.error) {
        return {
          ...state,
          isLoading: { ...state.isLoading, [action.operation]: false },
          errors: { ...state.errors, [action.operation]: action.error },
        };
      }
      return null;
    
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