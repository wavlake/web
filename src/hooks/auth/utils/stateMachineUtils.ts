/**
 * State Machine Utilities
 * 
 * Helper functions for implementing the Promise-Based State Machine pattern
 * across all authentication flows.
 */

import { BaseStateMachineState, ActionResult, AsyncActionHandler, BaseStateMachineAction, AsyncStartAction, AsyncSuccessAction, AsyncErrorAction } from '../machines/types';

// Helper to create async action wrapper
export function createAsyncAction<TArgs extends unknown[], TResult>(
  operation: string,
  asyncFn: (...args: TArgs) => Promise<TResult>,
  dispatch: React.Dispatch<BaseStateMachineAction>
): AsyncActionHandler<TArgs, TResult> {
  return async (...args: TArgs): Promise<ActionResult<TResult>> => {
    dispatch({ type: "ASYNC_START", operation } as AsyncStartAction);
    
    try {
      const result = await asyncFn(...args);
      dispatch({ type: "ASYNC_SUCCESS", operation, data: result } as AsyncSuccessAction);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "ASYNC_ERROR", operation, error: errorMessage } as AsyncErrorAction);
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
  action: BaseStateMachineAction
): Partial<TState> | null {
  switch (action.type) {
    case "ASYNC_START": {
      const asyncAction = action as AsyncStartAction;
      return {
        ...state,
        isLoading: { ...state.isLoading, [asyncAction.operation]: true },
        errors: { ...state.errors, [asyncAction.operation]: null },
      };
    }
    
    case "ASYNC_SUCCESS": {
      const asyncAction = action as AsyncSuccessAction;
      return {
        ...state,
        isLoading: { ...state.isLoading, [asyncAction.operation]: false },
      };
    }
    
    case "ASYNC_ERROR": {
      const asyncAction = action as AsyncErrorAction;
      return {
        ...state,
        isLoading: { ...state.isLoading, [asyncAction.operation]: false },
        errors: { ...state.errors, [asyncAction.operation]: asyncAction.error },
      };
    }
    
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