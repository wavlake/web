/**
 * AuthFlow Container Component
 * 
 * Main orchestrator for the new authentication system.
 * This replaces the complex Index.tsx with a clean state machine-driven flow.
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/dialog';
import { useAuthFlow } from '@/hooks/auth/useAuthFlow';
import { useNostrAuthentication } from '@/hooks/auth/useNostrAuthentication';
import { useFirebaseAuthentication } from '@/hooks/auth/useFirebaseAuthentication';
import { useAccountDiscovery } from '@/hooks/auth/useAccountDiscovery';
import { useAccountLinking } from '@/hooks/auth/useAccountLinking';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfileSync } from '@/hooks/useProfileSync';
import { AuthMethodSelector } from './AuthMethodSelector';
import { NostrAuthForm } from './NostrAuthForm';
import { FirebaseAuthForm } from './FirebaseAuthForm';
import { AccountDiscoveryScreen } from './AccountDiscoveryScreen';
import { toast } from '@/hooks/useToast';
import type { NLoginType } from '@nostrify/react/login';
import type { NostrAuthMethod, NostrCredentials } from '@/types/authFlow';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert NLoginType to AuthenticatedUser for state machine
 */
function convertToAuthenticatedUser(login: NLoginType) {
  return {
    pubkey: login.pubkey,
    signer: login, // Will be processed by useCurrentUser
    // Profile will be fetched by useCurrentUser
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AuthFlow Component
 * 
 * The main authentication flow orchestrator that replaces the complex
 * state management in the legacy Index.tsx. This component uses the
 * state machine pattern to provide a clean, predictable auth flow.
 * 
 * Features:
 * - State machine-driven navigation
 * - Clear separation of concerns
 * - Automatic authenticated user redirection
 * - Comprehensive error handling
 * - Profile synchronization
 * - Account linking integration
 * 
 * @example
 * ```tsx
 * // Replace Index.tsx with this component
 * function App() {
 *   return (
 *     <Router>
 *       <Routes>
 *         <Route path="/" element={<AuthFlow />} />
 *         <Route path="/legacy-login" element={<LegacyIndex />} />
 *         {/* other routes */}
 *       </Routes>
 *     </Router>
 *   );
 * }
 * ```
 */
export function AuthFlow() {
  const { user: currentUser } = useCurrentUser();
  const { state, context, send } = useAuthFlow();
  const { syncProfile } = useProfileSync();

  // Business logic hooks
  const nostrAuth = useNostrAuthentication();
  const firebaseAuth = useFirebaseAuthentication();
  const accountDiscovery = useAccountDiscovery(
    context.firebaseUser,
    context.isNewUser
  );
  const accountLinking = useAccountLinking();

  // Redirect authenticated users to /groups
  useEffect(() => {
    if (currentUser) {
      // User is already authenticated, redirect
      window.location.replace('/groups');
    }
  }, [currentUser]);

  // Don't render auth flow if user is authenticated
  if (currentUser) {
    return null;
  }

  // Handle Nostr authentication
  const handleNostrAuth = async (method: NostrAuthMethod, credentials: NostrCredentials) => {
    try {
      const login = await nostrAuth.authenticate(method, credentials);
      
      // Sync profile after successful login
      await syncProfile(login.pubkey);
      
      // If we have a Firebase user context, we're doing targeted auth
      if (context.firebaseUser) {
        // Link the account
        await accountLinking.linkAccount(context.firebaseUser, login.pubkey);
        
        // Complete the flow
        const user = convertToAuthenticatedUser(login);
        send({ type: 'LINKING_COMPLETE', user });
      } else {
        // Direct Nostr auth - complete immediately
        send({ type: 'NOSTR_SUCCESS', login });
      }
    } catch (error) {
      console.error('Nostr authentication failed:', error);
      send({ type: 'ERROR', error: error instanceof Error ? error.message : 'Authentication failed' });
    }
  };

  // Handle Firebase authentication
  const handleFirebaseAuth = async (email: string, password: string, isSignUp: boolean) => {
    try {
      const result = isSignUp 
        ? await firebaseAuth.signUp(email, password)
        : await firebaseAuth.signIn(email, password);
      
      send({ 
        type: 'FIREBASE_SUCCESS', 
        user: result.user, 
        isNewUser: result.isNewUser 
      });
    } catch (error) {
      console.error('Firebase authentication failed:', error);
      send({ type: 'ERROR', error: error instanceof Error ? error.message : 'Authentication failed' });
    }
  };

  // Handle account selection
  const handleAccountSelection = (pubkey: string) => {
    send({ type: 'ACCOUNT_SELECTED', pubkey });
  };

  // Handle different account flow
  const handleUseDifferentAccount = () => {
    send({ type: 'USE_DIFFERENT_ACCOUNT' });
  };

  // Handle generate new account
  const handleGenerateNewAccount = () => {
    send({ type: 'GENERATE_NEW_ACCOUNT' });
  };

  // Handle back navigation
  const handleBack = () => {
    send({ type: 'BACK' });
  };

  // Handle retry from error state
  const handleRetry = () => {
    send({ type: 'RETRY' });
  };

  // Handle refresh in account discovery
  const handleRefresh = () => {
    accountDiscovery.refresh();
  };

  // Render based on current state
  switch (state.type) {
    case 'method-selection':
      return (
        <AuthMethodSelector
          onSelectMethod={(method) => {
            if (method === 'nostr') send({ type: 'SELECT_NOSTR' });
            else if (method === 'firebase') send({ type: 'SELECT_FIREBASE' });
            else if (method === 'create-account') send({ type: 'SELECT_CREATE_ACCOUNT' });
          }}
          isLoading={false}
          error={context.error}
        />
      );

    case 'nostr-auth':
      return (
        <Dialog open={true} onOpenChange={() => {}}>
          <NostrAuthForm
            onAuthenticate={handleNostrAuth}
            onBack={handleBack}
            isLoading={nostrAuth.isLoading}
            error={nostrAuth.error}
            supportedMethods={nostrAuth.supportedMethods}
            expectedPubkey={context.selectedPubkey}
          />
        </Dialog>
      );

    case 'firebase-auth':
      return (
        <FirebaseAuthForm
          onAuthenticate={handleFirebaseAuth}
          onBack={handleBack}
          isLoading={firebaseAuth.isLoading}
          error={firebaseAuth.error}
          initialMode={state.mode}
        />
      );

    case 'account-discovery':
      if (!context.firebaseUser) {
        // This shouldn't happen with proper state machine, but handle gracefully
        send({ type: 'ERROR', error: 'Missing Firebase user context' });
        return null;
      }

      return (
        <AccountDiscoveryScreen
          firebaseUser={context.firebaseUser}
          linkedAccounts={accountDiscovery.linkedAccounts}
          legacyProfile={accountDiscovery.legacyProfile}
          isLoading={accountDiscovery.isLoading}
          error={accountDiscovery.error}
          onSelectAccount={handleAccountSelection}
          onUseDifferentAccount={handleUseDifferentAccount}
          onGenerateNewAccount={handleGenerateNewAccount}
          onBack={handleBack}
          onRefresh={handleRefresh}
        />
      );

    case 'account-linking':
      if (!context.firebaseUser || !context.selectedPubkey) {
        send({ type: 'ERROR', error: 'Missing linking context' });
        return null;
      }

      return (
        <Dialog open={true} onOpenChange={() => {}}>
          <NostrAuthForm
            onAuthenticate={handleNostrAuth}
            onBack={handleBack}
            isLoading={nostrAuth.isLoading || accountLinking.isLinking}
            error={nostrAuth.error || accountLinking.error}
            supportedMethods={nostrAuth.supportedMethods}
            expectedPubkey={context.selectedPubkey}
            title="Sign in to link your account"
            description="Please sign in with your Nostr account to link it to your Wavlake profile"
          />
        </Dialog>
      );

    case 'completed':
      // This will be handled by the useEffect redirect, but provide fallback
      return <Navigate to="/groups" replace />;

    case 'error':
      return (
        <AuthMethodSelector
          onSelectMethod={(method) => {
            if (method === 'nostr') send({ type: 'SELECT_NOSTR' });
            else if (method === 'firebase') send({ type: 'SELECT_FIREBASE' });
            else if (method === 'create-account') send({ type: 'SELECT_CREATE_ACCOUNT' });
          }}
          isLoading={false}
          error={context.error}
        />
      );

    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error('Unknown auth flow state:', state);
      return (
        <AuthMethodSelector
          onSelectMethod={(method) => {
            if (method === 'nostr') send({ type: 'SELECT_NOSTR' });
            else if (method === 'firebase') send({ type: 'SELECT_FIREBASE' });
            else if (method === 'create-account') send({ type: 'SELECT_CREATE_ACCOUNT' });
          }}
          isLoading={false}
          error="An unexpected error occurred. Please try again."
        />
      );
  }
}

// ============================================================================
// Development Helper
// ============================================================================

/**
 * Development version with debug information
 * Only available in development mode
 */
export function AuthFlowWithDebug() {
  const authFlow = useAuthFlow();
  
  if (process.env.NODE_ENV === 'development') {
    console.group('🔐 Auth Flow Debug');
    console.log('State:', authFlow.state);
    console.log('Context:', authFlow.context);
    console.log('Can go back:', authFlow.state.type !== 'method-selection');
    console.groupEnd();
  }
  
  return <AuthFlow />;
}

export default AuthFlow;