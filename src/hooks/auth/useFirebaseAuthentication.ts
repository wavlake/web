/**
 * Pure Firebase authentication hook
 *
 * This hook handles Firebase email/password authentication without any UI coupling,
 * extracted from the legacy FirebaseAuthForm component.
 */

import { useState, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  AuthError as FirebaseAuthError,
} from "firebase/auth";
import { User as FirebaseUser } from "firebase/auth";
import { initializeFirebaseAuth } from "@/lib/firebaseAuth";
import type { FirebaseAuthResult } from "@/types/authFlow";

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getFirebaseErrorMessage(error: FirebaseAuthError): string {
  switch (error.code) {
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled. Please contact support.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled. Please try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in process is already in progress.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked. Please allow popups for this site.";
    default:
      console.warn("Unknown Firebase auth error:", error.code, error.message);
      return "Authentication failed. Please try again.";
  }
}

/**
 * Generic error message handler
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return getFirebaseErrorMessage(error as FirebaseAuthError);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email format
 */
function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
function validatePassword(
  password: string,
  isSignUp: boolean = false
): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (isSignUp && password.length < 6) {
    return {
      isValid: false,
      error: "Password must be at least 6 characters long",
    };
  }

  return { isValid: true };
}

/**
 * Validate both email and password
 */
function validateCredentials(
  email: string,
  password: string,
  isSignUp: boolean = false
): { isValid: boolean; errors: { email?: string; password?: string } } {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password, isSignUp);

  const errors: { email?: string; password?: string } = {};

  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  return {
    isValid: emailValidation.isValid && passwordValidation.isValid,
    errors,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Pure Firebase authentication hook
 *
 * This hook provides Firebase email/password authentication functionality
 * without any UI coupling. It handles both sign-in and sign-up flows.
 *
 * Features:
 * - Email/password sign-in and sign-up
 * - Comprehensive validation and error handling
 * - User-friendly error messages
 * - No UI dependencies
 *
 * @example
 * ```tsx
 * function FirebaseAuthForm() {
 *   const { signIn, signUp, isLoading, error } = useFirebaseAuthentication();
 *
 *   const handleSubmit = async (email: string, password: string, isSignUp: boolean) => {
 *     try {
 *       const result = isSignUp
 *         ? await signUp(email, password)
 *         : await signIn(email, password);
 *       onSuccess(result.user, result.isNewUser);
 *     } catch (error) {
 *       // Error is already handled by the hook
 *     }
 *   };
 * }
 * ```
 */
export function useFirebaseAuthentication(): FirebaseAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isLoading) {
        throw new Error("Authentication already in progress");
      }

      // Validate credentials
      const validation = validateCredentials(email, password, false);
      if (!validation.isValid) {
        const errorMessage =
          validation.errors.email ||
          validation.errors.password ||
          "Invalid credentials";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      setIsLoading(true);
      setError(null);

      try {
        const { auth } = initializeFirebaseAuth();
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        setIsLoading(false);

        return {
          user: userCredential.user,
          isNewUser: false, // Existing user signing in
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        setError(errorMessage);
        setIsLoading(false);
        throw new Error(errorMessage);
      }
    },
    [isLoading]
  );

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(
    async (email: string, password: string) => {
      if (isLoading) {
        throw new Error("Authentication already in progress");
      }

      // Validate credentials with sign-up rules
      const validation = validateCredentials(email, password, true);
      if (!validation.isValid) {
        const errorMessage =
          validation.errors.email ||
          validation.errors.password ||
          "Invalid credentials";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      setIsLoading(true);
      setError(null);

      try {
        const { auth } = initializeFirebaseAuth();
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        setIsLoading(false);

        return {
          user: userCredential.user,
          isNewUser: true, // New user signing up
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        setError(errorMessage);
        setIsLoading(false);
        throw new Error(errorMessage);
      }
    },
    [isLoading]
  );

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logOut = useCallback(async () => {
    if (isLoading) {
      throw new Error("Authentication already in progress");
    }
    setIsLoading(true);
    setError(null);
    try {
      const { auth } = initializeFirebaseAuth();
      if (auth.currentUser) {
        await auth.signOut();
      }
      setIsLoading(false);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, [isLoading]);

  return {
    signIn,
    signUp,
    isLoading,
    error,
    clearError,
    logOut,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if email format is valid (for real-time validation)
 */
export function isValidEmail(email: string): boolean {
  const validation = validateEmail(email);
  return validation.isValid;
}

/**
 * Check if password meets requirements (for real-time validation)
 */
export function isValidPassword(
  password: string,
  isSignUp: boolean = false
): boolean {
  const validation = validatePassword(password, isSignUp);
  return validation.isValid;
}

/**
 * Get password strength indicator
 */
export function getPasswordStrength(
  password: string
): "weak" | "medium" | "strong" {
  if (password.length < 6) return "weak";
  if (password.length < 12) return "medium";
  return "strong";
}

/**
 * Get user display name from Firebase user
 */
export function getUserDisplayName(user: FirebaseUser): string {
  return user.displayName || user.email || "User";
}
