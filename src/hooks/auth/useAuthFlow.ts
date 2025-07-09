/**
 * Core authentication flow state machine
 * 
 * This hook replaces the complex scattered state management in the legacy Index.tsx
 * with a clean state machine pattern that makes the auth flow predictable and debuggable.
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type {
  AuthFlowState,
  AuthFlowEvent,
  AuthFlowContext,
  AuthFlowResult,
  AuthenticatedUser
} from '@/types/authFlow';

// ============================================================================
// State Machine Reducer
// ============================================================================

function authFlowReducer(
  state: AuthFlowState,
  event: AuthFlowEvent
): AuthFlowState {
  
  switch (state.type) {
    case 'method-selection':
      switch (event.type) {
        case 'SELECT_NOSTR':
          return { type: 'nostr-auth' };
        case 'SELECT_FIREBASE':
          return { type: 'firebase-auth', mode: 'signin' };
        case 'SELECT_CREATE_ACCOUNT':
          // Navigate to create account - handled by side effect
          return state;
        default:
          return state;
      }

    case 'nostr-auth':
      switch (event.type) {
        case 'SET_NOSTR_METHOD':
          return { ...state, method: event.method };
        case 'NOSTR_SUCCESS':
          // Direct Nostr auth success - no Firebase user to link
          return {
            type: 'completed',
            user: {
              pubkey: event.login.pubkey,
              signer: event.login, // Will be converted by business logic
            }
          };
        case 'BACK':
          return { type: 'method-selection' };
        case 'ERROR':
          return {
            type: 'error',
            error: event.error,
            previousState: state
          };
        default:
          return state;
      }

    case 'firebase-auth':
      switch (event.type) {
        case 'SET_FIREBASE_MODE':
          return { ...state, mode: event.mode };
        case 'FIREBASE_SUCCESS':
          return {
            type: 'account-discovery',
            firebaseUser: event.user,
            isNewUser: event.isNewUser
          };
        case 'BACK':
          return { type: 'method-selection' };
        case 'ERROR':
          return {
            type: 'error',
            error: event.error,
            previousState: state
          };
        default:
          return state;
      }

    case 'account-discovery':
      switch (event.type) {
        case 'ACCOUNT_SELECTED':
          return {
            type: 'account-linking',
            firebaseUser: state.firebaseUser,
            selectedPubkey: event.pubkey
          };
        case 'USE_DIFFERENT_ACCOUNT':
          return {
            type: 'nostr-auth',
            // Pass Firebase user context for potential linking
          };
        case 'GENERATE_NEW_ACCOUNT':
          // Navigate to create account with Firebase context - handled by side effect
          return state;
        case 'BACK':
          return { type: 'method-selection' };
        case 'ERROR':
          return {
            type: 'error',
            error: event.error,
            previousState: state
          };
        default:
          return state;
      }

    case 'account-linking':
      switch (event.type) {
        case 'LINKING_COMPLETE':
          return {
            type: 'completed',
            user: event.user
          };
        case 'BACK':
          return {
            type: 'account-discovery',
            firebaseUser: state.firebaseUser
          };
        case 'ERROR':
          return {
            type: 'error',
            error: event.error,
            previousState: state
          };
        default:
          return state;
      }

    case 'completed':
      switch (event.type) {
        case 'RESET':
          return { type: 'method-selection' };
        default:
          return state;
      }

    case 'error':
      switch (event.type) {
        case 'RETRY':
          return state.previousState || { type: 'method-selection' };
        case 'BACK':
          return state.previousState || { type: 'method-selection' };
        case 'RESET':
          return { type: 'method-selection' };
        default:
          return state;
      }

    default:
      return state;
  }
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthFlowState = { type: 'method-selection' };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get initial state based on URL search parameters
 */
function getInitialStateFromUrl(searchParams: URLSearchParams): AuthFlowState {
  const stateParam = searchParams.get('state');
  
  switch (stateParam) {
    case 'firebase-auth':
      return { type: 'firebase-auth', mode: 'signin' };
    case 'firebase-signup':
      return { type: 'firebase-auth', mode: 'signup' };
    case 'nostr-auth':
      return { type: 'nostr-auth' };
    default:
      return initialState;
  }
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Core authentication flow state machine hook
 * 
 * This hook manages the entire authentication flow state, replacing the
 * complex scattered state management in the legacy system.
 * 
 * Features:
 * - Predictable state transitions
 * - Impossible states eliminated
 * - Clear separation of state and side effects
 * - Easy debugging and testing
 * - URL parameter support for direct state navigation
 * 
 * URL Parameters:
 * - `?state=firebase-auth` - Start with Firebase sign-in form
 * - `?state=firebase-signup` - Start with Firebase sign-up form
 * - `?state=nostr-auth` - Start with Nostr authentication
 * 
 * @example
 * ```tsx
 * function AuthFlow() {
 *   const { state, send, context, can } = useAuthFlow();
 *   
 *   switch (state.type) {
 *     case 'method-selection':
 *       return <AuthMethodSelector onSelectMethod={(method) => send({ type: `SELECT_${method.toUpperCase()}` })} />;
 *     case 'nostr-auth':
 *       return <NostrAuthForm onSuccess={(login) => send({ type: 'NOSTR_SUCCESS', login })} />;
 *     // ... other states
 *   }
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Navigate directly to Firebase auth
 * navigate("/?state=firebase-auth");
 * 
 * // Navigate directly to Nostr auth
 * navigate("/?state=nostr-auth");
 * ```
 */
export function useAuthFlow(): AuthFlowResult {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, dispatch] = useReducer(authFlowReducer, searchParams, getInitialStateFromUrl);

  // Extract context from current state
  const context = useMemo((): AuthFlowContext => {
    const ctx: AuthFlowContext = {};

    if (state.type === 'account-discovery' || state.type === 'account-linking') {
      ctx.firebaseUser = state.firebaseUser;
    }
    
    if (state.type === 'account-discovery') {
      ctx.isNewUser = state.isNewUser;
    }

    if (state.type === 'account-linking') {
      ctx.selectedPubkey = state.selectedPubkey;
    }

    if (state.type === 'error') {
      ctx.error = state.error;
    }

    return ctx;
  }, [state]);

  // Clean up URL parameters when state changes
  useEffect(() => {
    // Clear state parameter from URL when we move away from initial URL-driven state
    if (state.type !== 'method-selection' && searchParams.has('state')) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('state');
        return newParams;
      });
    }
  }, [state.type, searchParams, setSearchParams]);

  // Enhanced send function with side effects
  const send = useCallback((event: AuthFlowEvent) => {
    // Handle navigation side effects
    if (event.type === 'SELECT_CREATE_ACCOUNT') {
      navigate('/create-account', {
        state: {
          source: 'onboarding',
          returnPath: '/groups',
        }
      });
      return;
    }

    if (event.type === 'GENERATE_NEW_ACCOUNT' && context.firebaseUser) {
      navigate('/create-account', {
        state: {
          firebaseUserData: {
            uid: context.firebaseUser.uid,
            email: context.firebaseUser.email,
            displayName: context.firebaseUser.displayName,
            photoURL: context.firebaseUser.photoURL,
          },
          source: 'firebase-generation',
          returnPath: '/groups',
        }
      });
      return;
    }

    if (event.type === 'LINKING_COMPLETE' || event.type === 'NOSTR_SUCCESS') {
      // Navigate to success destination after auth completion
      setTimeout(() => {
        navigate('/groups', { replace: true });
      }, 100);
    }

    // Dispatch state machine event
    dispatch(event);
  }, [navigate, context.firebaseUser]);

  // Check if an event can be sent in current state
  const can = useCallback((event: AuthFlowEvent): boolean => {
    // This is a simplified version - in a real implementation you might want
    // to check if the transition is valid without actually dispatching
    try {
      const nextState = authFlowReducer(state, event);
      return nextState !== state; // Event caused a state change
    } catch {
      return false;
    }
  }, [state]);

  // Determine loading state based on current state
  const isLoading = useMemo(() => {
    // Add loading states as needed based on your requirements
    return false; // Individual hooks will manage their own loading states
  }, []);

  return {
    state,
    context,
    send,
    can,
    isLoading,
  };
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Development helper to visualize current auth flow state
 * Only available in development mode
 */
export function useAuthFlowDebug() {
  const flow = useAuthFlow();
  
  if (process.env.NODE_ENV === 'development') {
    // Log state changes for debugging
    console.group('🔐 Auth Flow State');
    console.log('Current State:', flow.state);
    console.log('Context:', flow.context);
    console.groupEnd();
  }

  return flow;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the current state allows going back
 */
export function canGoBack(state: AuthFlowState): boolean {
  return state.type !== 'method-selection' && state.type !== 'completed';
}

/**
 * Get user-friendly state description for UI
 */
export function getStateDescription(state: AuthFlowState): string {
  switch (state.type) {
    case 'method-selection':
      return 'Choose how to sign in';
    case 'nostr-auth':
      return 'Sign in with Nostr';
    case 'firebase-auth':
      return state.mode === 'signin' ? 'Sign in to your account' : 'Create new account';
    case 'account-discovery':
      return 'Choose your account';
    case 'account-linking':
      return 'Connecting your accounts';
    case 'completed':
      return 'Welcome to Wavlake!';
    case 'error':
      return 'Something went wrong';
    default:
      return 'Loading...';
  }
}