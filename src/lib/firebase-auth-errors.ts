/**
 * Firebase authentication error handling utilities
 */

export interface FirebaseError {
  code?: string;
  message?: string;
}

/**
 * Map of Firebase error codes to user-friendly messages
 */
export const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/user-not-found": "No account found with this email address.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-email": "Invalid email address.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/operation-not-allowed": "This operation is not allowed.",
  "auth/weak-password": "Password is too weak. Please choose a stronger password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-credential": "Invalid email or password. Please check your credentials.",
  "auth/account-exists-with-different-credential": "An account already exists with a different sign-in method.",
  "auth/network-request-failed": "Network error. Please check your internet connection.",
  "auth/popup-closed-by-user": "Authentication popup was closed before completion.",
  "auth/requires-recent-login": "This operation requires recent authentication. Please sign in again.",
  "auth/invalid-login-credentials": "Invalid email or password. Please check your credentials.",
  "auth/missing-password": "Please enter your password.",
  "auth/missing-email": "Please enter your email address.",
};

/**
 * Get a user-friendly error message for a Firebase error
 * @param error The Firebase error object
 * @param defaultMessage Default message to use if no specific mapping exists
 * @returns User-friendly error message
 */
export const getFirebaseErrorMessage = (
  error: FirebaseError,
  defaultMessage: string = "An error occurred. Please try again."
): string => {
  if (error.code && FIREBASE_AUTH_ERROR_MESSAGES[error.code]) {
    return FIREBASE_AUTH_ERROR_MESSAGES[error.code];
  }
  
  return error.message || defaultMessage;
};

/**
 * Handle Firebase authentication errors with consistent logging and user-friendly messages
 * @param error The error object
 * @param defaultMessage Default message to use if no specific mapping exists
 * @param setError Function to set the error state
 */
export const handleFirebaseError = (
  error: unknown,
  defaultMessage: string,
  setError: (message: string) => void
): void => {
  console.error(defaultMessage, error);
  
  const firebaseError = error as FirebaseError;
  const errorMessage = getFirebaseErrorMessage(firebaseError, defaultMessage);
  
  setError(errorMessage);
};