/**
 * Passwordless Authentication Completion Hook
 *
 * Handles completion of Firebase passwordless authentication flows.
 * This hook detects when the user clicks an email link and completes
 * the sign-in process.
 */

import { useEffect, useCallback, useRef } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/hooks/useToast";

export interface AuthFlowContext {
  flow: 'signup' | 'legacy-migration';
  step: string;
  additionalData?: {
    isArtist?: boolean;
    email?: string;
  };
}

interface UsePasswordlessCompletionOptions {
  onSuccess?: (user: any) => void;
  onError?: (error: Error) => void;
}

export function usePasswordlessCompletion(options: UsePasswordlessCompletionOptions = {}) {
  const firebaseAuth = useFirebaseAuth();
  const { toast } = useToast();
  const { onSuccess, onError } = options;
  const completionHandledRef = useRef(false);

  const handlePasswordlessCompletion = useCallback(async () => {
    if (!firebaseAuth.isConfigured) {
      return;
    }

    // Check if the current URL is a sign-in link
    if (!firebaseAuth.isPasswordlessSignInLink(window.location.href)) {
      return;
    }

    // Prevent multiple completion handlers
    if (completionHandledRef.current) {
      console.log('Passwordless completion already handled, skipping');
      return;
    }
    completionHandledRef.current = true;

    try {
      // Get the email from localStorage (should have been stored when link was sent)
      const email = localStorage.getItem('passwordless-email');
      
      if (!email) {
        throw new Error('No email found for passwordless sign-in. Please try the authentication process again.');
      }

      // Complete the sign-in
      const userCredential = await firebaseAuth.completePasswordlessSignIn(
        email,
        window.location.href
      );

      // Clear the stored email
      localStorage.removeItem('passwordless-email');

      // Clear the URL to remove the authentication parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show success message
      toast({
        title: "Authentication successful",
        description: "You have been signed in successfully.",
        variant: "default",
      });

      // Call success callback
      onSuccess?.(userCredential.user);

    } catch (error) {
      console.error('Passwordless sign-in completion failed:', error);
      
      // Reset completion flag on error
      completionHandledRef.current = false;
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to complete sign-in from email link';

      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Call error callback
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [firebaseAuth, toast, onSuccess, onError, completionHandledRef]);

  // Run completion handler on mount and when URL changes
  useEffect(() => {
    handlePasswordlessCompletion();
  }, [handlePasswordlessCompletion]);

  // Helper function to store email when sending passwordless link
  const storeEmailForPasswordlessAuth = useCallback((email: string) => {
    localStorage.setItem('passwordless-email', email);
  }, []);

  // Helper functions for flow context management
  const storeFlowContext = useCallback((context: AuthFlowContext) => {
    localStorage.setItem('auth-flow-context', JSON.stringify(context));
  }, []);

  const getAndClearFlowContext = useCallback((): AuthFlowContext | null => {
    const stored = localStorage.getItem('auth-flow-context');
    if (stored) {
      localStorage.removeItem('auth-flow-context');
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const getFlowContext = useCallback((): AuthFlowContext | null => {
    const stored = localStorage.getItem('auth-flow-context');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const resetCompletionHandler = useCallback(() => {
    completionHandledRef.current = false;
  }, []);

  return {
    handlePasswordlessCompletion,
    storeEmailForPasswordlessAuth,
    storeFlowContext,
    getAndClearFlowContext,
    getFlowContext,
    resetCompletionHandler,
    isPasswordlessSignInLink: firebaseAuth.isPasswordlessSignInLink,
  };
}