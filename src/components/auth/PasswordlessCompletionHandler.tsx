/**
 * Passwordless Completion Handler Component
 *
 * A background component that handles the completion of Firebase
 * passwordless authentication when users click email links.
 */

// import { useEffect } from 'react'; // Commented out - not currently used
import { usePasswordlessCompletion } from '@/hooks/auth/usePasswordlessCompletion';
export function PasswordlessCompletionHandler() {

  usePasswordlessCompletion({
    onSuccess: async (firebaseUser) => {
      // The user will now be authenticated with Firebase and can continue
      // their flow (either legacy migration or signup completion)
      console.log('Passwordless authentication completed for user:', firebaseUser.email);
      console.log('Flow will be resumed by Login.tsx if context exists');
    },
    onError: (error) => {
      console.error('Passwordless authentication failed:', error);
    },
  });

  // This component doesn't render anything, it just handles the authentication
  return null;
}