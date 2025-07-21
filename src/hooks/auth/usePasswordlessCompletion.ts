/**
 * Passwordless Authentication Completion Hook
 *
 * Handles completion of Firebase passwordless authentication flows.
 * This hook detects when the user clicks an email link and completes
 * the sign-in process.
 */

import { useEffect, useCallback } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/hooks/useToast";

interface UsePasswordlessCompletionOptions {
  onSuccess?: (user: any) => void;
  onError?: (error: Error) => void;
}

export function usePasswordlessCompletion(options: UsePasswordlessCompletionOptions = {}) {
  const firebaseAuth = useFirebaseAuth();
  const { toast } = useToast();
  const { onSuccess, onError } = options;

  const handlePasswordlessCompletion = useCallback(async () => {
    if (!firebaseAuth.isConfigured) {
      return;
    }

    // Check if the current URL is a sign-in link
    if (!firebaseAuth.isPasswordlessSignInLink(window.location.href)) {
      return;
    }

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
  }, [firebaseAuth, toast, onSuccess, onError]);

  // Run completion handler on mount and when URL changes
  useEffect(() => {
    handlePasswordlessCompletion();
  }, [handlePasswordlessCompletion]);

  // Helper function to store email when sending passwordless link
  const storeEmailForPasswordlessAuth = useCallback((email: string) => {
    localStorage.setItem('passwordless-email', email);
  }, []);

  return {
    handlePasswordlessCompletion,
    storeEmailForPasswordlessAuth,
    isPasswordlessSignInLink: firebaseAuth.isPasswordlessSignInLink,
  };
}