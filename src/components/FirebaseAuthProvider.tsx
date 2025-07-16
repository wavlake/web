/**
 * Firebase Authentication Context Provider
 *
 * Comprehensive Firebase auth management with:
 * - Login methods (email/password, external providers)
 * - Logout functionality
 * - Firebase auth token for HTTP requests
 * - User metadata management
 * - Reset password capabilities
 * - Passwordless login functionality
 * - External provider support (Google, Apple, Twitter, etc.)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  type AuthProvider,
  type UserCredential,
} from "firebase/auth";
import {
  initializeFirebaseAuth,
  isFirebaseAuthConfigured,
} from "@/lib/firebaseAuth";
import { handleFirebaseError } from "@/lib/firebase-auth-errors";

// Types

export interface AuthError {
  code?: string;
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  displayName?: string;
}

export interface PasswordlessLoginOptions {
  email: string;
  actionCodeSettings?: {
    url: string;
    handleCodeInApp: boolean;
    dynamicLinkDomain?: string;
  };
}

export interface AuthContextType {
  // Auth state
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  isConfigured: boolean;

  // Auth token management
  getAuthToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;

  // Login methods
  loginWithEmailAndPassword: (
    credentials: LoginCredentials
  ) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  loginWithTwitter: () => Promise<UserCredential>;
  loginWithApple: () => Promise<UserCredential>;

  // Registration
  registerWithEmailAndPassword: (
    credentials: RegisterCredentials
  ) => Promise<UserCredential>;

  // Passwordless login
  sendPasswordlessSignInLink: (
    options: PasswordlessLoginOptions
  ) => Promise<void>;
  completePasswordlessSignIn: (
    email: string,
    emailLink?: string
  ) => Promise<UserCredential>;
  isPasswordlessSignInLink: (url?: string) => boolean;

  // Password management
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (
    newPassword: string,
    currentPassword?: string
  ) => Promise<void>;

  // Profile management
  updateUserProfile: (updates: {
    displayName?: string;
    photoURL?: string;
  }) => Promise<void>;
  updateUserEmail: (
    newEmail: string,
    currentPassword?: string
  ) => Promise<void>;

  // Logout
  logout: () => Promise<void>;

  // Utility methods
  clearError: () => void;
  reauthenticate: (password: string) => Promise<void>;
  
  // Validation helpers
  isValidEmail: (email: string) => boolean;
  isValidPassword: (password: string, strict?: boolean) => boolean;
  getPasswordStrength: (password: string) => 'weak' | 'medium' | 'strong';
}

// Create context
const FirebaseAuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Provider Props
interface FirebaseAuthProviderProps {
  children: React.ReactNode;
}

// Provider Component
export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isConfigured] = useState(() => isFirebaseAuthConfigured());

  // Initialize Firebase Auth
  const getAuth = useCallback(() => {
    if (!isConfigured) {
      throw new Error("Firebase is not configured");
    }
    return initializeFirebaseAuth().auth;
  }, [isConfigured]);


  // Error handler
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    handleFirebaseError(error, defaultMessage, (message) => {
      setError({ message });
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Validation helpers
  const isValidEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const isValidPassword = useCallback((password: string, strict: boolean = false): boolean => {
    if (strict) {
      // Strict validation for signup
      return password.length >= 6;
    }
    // Less strict for signin
    return password.length > 0;
  }, []);

  const getPasswordStrength = useCallback((password: string): 'weak' | 'medium' | 'strong' => {
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const criteria = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (criteria >= 3) return 'strong';
    if (criteria >= 2) return 'medium';
    return 'weak';
  }, []);

  // Get auth token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!user) return null;
      return await user.getIdToken();
    } catch (error) {
      handleError(error, "Failed to get authentication token");
      return null;
    }
  }, [user, handleError]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!user) return null;
      return await user.getIdToken(true);
    } catch (error) {
      handleError(error, "Failed to refresh authentication token");
      return null;
    }
  }, [user, handleError]);

  // Login with email and password
  const loginWithEmailAndPassword = useCallback(
    async (credentials: LoginCredentials): Promise<UserCredential> => {
      try {
        clearError();
        const auth = getAuth();
        return await signInWithEmailAndPassword(
          auth,
          credentials.email,
          credentials.password
        );
      } catch (error) {
        handleError(error, "Login failed");
        throw error;
      }
    },
    [getAuth, clearError, handleError]
  );

  // Register with email and password
  const registerWithEmailAndPassword = useCallback(
    async (credentials: RegisterCredentials): Promise<UserCredential> => {
      try {
        clearError();
        const auth = getAuth();
        const result = await createUserWithEmailAndPassword(
          auth,
          credentials.email,
          credentials.password
        );

        // Update profile if displayName provided
        if (credentials.displayName && result.user) {
          await updateProfile(result.user, {
            displayName: credentials.displayName,
          });
        }

        return result;
      } catch (error) {
        handleError(error, "Registration failed");
        throw error;
      }
    },
    [getAuth, clearError, handleError]
  );

  // External provider login helper
  const loginWithProvider = useCallback(
    async (provider: AuthProvider): Promise<UserCredential> => {
      try {
        clearError();
        const auth = getAuth();
        return await signInWithPopup(auth, provider);
      } catch (error) {
        handleError(error, "External login failed");
        throw error;
      }
    },
    [getAuth, clearError, handleError]
  );

  // Google login
  const loginWithGoogle = useCallback(async (): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  // Twitter login
  const loginWithTwitter = useCallback(async (): Promise<UserCredential> => {
    const provider = new TwitterAuthProvider();
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  // Apple login
  const loginWithApple = useCallback(async (): Promise<UserCredential> => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    return loginWithProvider(provider);
  }, [loginWithProvider]);

  // Send passwordless sign-in link
  const sendPasswordlessSignInLink = useCallback(
    async (options: PasswordlessLoginOptions): Promise<void> => {
      try {
        clearError();
        const auth = getAuth();

        const actionCodeSettings = options.actionCodeSettings || {
          url: window.location.origin + "/auth/complete",
          handleCodeInApp: true,
        };

        await sendSignInLinkToEmail(auth, options.email, actionCodeSettings);

        // Save email for sign-in completion
        window.localStorage.setItem("emailForSignIn", options.email);
      } catch (error) {
        handleError(error, "Failed to send passwordless sign-in link");
        throw error;
      }
    },
    [getAuth, clearError, handleError]
  );

  // Complete passwordless sign-in
  const completePasswordlessSignIn = useCallback(
    async (email: string, emailLink?: string): Promise<UserCredential> => {
      try {
        clearError();
        const auth = getAuth();
        const link = emailLink || window.location.href;

        return await signInWithEmailLink(auth, email, link);
      } catch (error) {
        handleError(error, "Failed to complete passwordless sign-in");
        throw error;
      }
    },
    [getAuth, clearError, handleError]
  );

  // Check if URL is passwordless sign-in link
  const isPasswordlessSignInLink = useCallback(
    (url?: string): boolean => {
      try {
        const auth = getAuth();
        return isSignInWithEmailLink(auth, url || window.location.href);
      } catch (error) {
        return false;
      }
    },
    [getAuth]
  );

  // Reset password
  const resetPassword = useCallback(
    async (email: string): Promise<void> => {
      try {
        clearError();
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        handleError(error, "Failed to send password reset email");
        throw error;
      }
    },
    [getAuth, clearError, handleError]
  );

  // Update user password
  const updateUserPassword = useCallback(
    async (newPassword: string, currentPassword?: string): Promise<void> => {
      try {
        clearError();
        if (!user) throw new Error("No user signed in");

        // Reauthenticate if current password provided
        if (currentPassword) {
          const credential = EmailAuthProvider.credential(
            user.email!,
            currentPassword
          );
          await reauthenticateWithCredential(user, credential);
        }

        await updatePassword(user, newPassword);
      } catch (error) {
        handleError(error, "Failed to update password");
        throw error;
      }
    },
    [user, clearError, handleError]
  );

  // Update user profile
  const updateUserProfile = useCallback(
    async (updates: {
      displayName?: string;
      photoURL?: string;
    }): Promise<void> => {
      try {
        clearError();
        if (!user) throw new Error("No user signed in");

        await updateProfile(user, updates);
      } catch (error) {
        handleError(error, "Failed to update profile");
        throw error;
      }
    },
    [user, clearError, handleError]
  );

  // Update user email
  const updateUserEmail = useCallback(
    async (newEmail: string, currentPassword?: string): Promise<void> => {
      try {
        clearError();
        if (!user) throw new Error("No user signed in");

        // Reauthenticate if current password provided
        if (currentPassword) {
          const credential = EmailAuthProvider.credential(
            user.email!,
            currentPassword
          );
          await reauthenticateWithCredential(user, credential);
        }

        await updateEmail(user, newEmail);
      } catch (error) {
        handleError(error, "Failed to update email");
        throw error;
      }
    },
    [user, clearError, handleError]
  );

  // Reauthenticate
  const reauthenticate = useCallback(
    async (password: string): Promise<void> => {
      try {
        clearError();
        if (!user || !user.email) throw new Error("No user signed in");

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } catch (error) {
        handleError(error, "Reauthentication failed");
        throw error;
      }
    },
    [user, clearError, handleError]
  );

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      clearError();
      const auth = getAuth();
      await signOut(auth);

      // Clear any stored passwordless sign-in email
      window.localStorage.removeItem("emailForSignIn");
    } catch (error) {
      handleError(error, "Logout failed");
      throw error;
    }
  }, [getAuth, clearError, handleError]);

  // Auth state listener
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Handle redirect result (for mobile apps)
    getRedirectResult(auth).catch((error) => {
      handleError(error, "Authentication redirect failed");
    });

    return unsubscribe;
  }, [isConfigured, getAuth, handleError]);

  // Context value
  const contextValue: AuthContextType = {
    // Auth state
    user,
    loading,
    error,
    isConfigured,

    // Auth token management
    getAuthToken,
    refreshToken,

    // Login methods
    loginWithEmailAndPassword,
    loginWithGoogle,
    loginWithTwitter,
    loginWithApple,

    // Registration
    registerWithEmailAndPassword,

    // Passwordless login
    sendPasswordlessSignInLink,
    completePasswordlessSignIn,
    isPasswordlessSignInLink,

    // Password management
    resetPassword,
    updateUserPassword,

    // Profile management
    updateUserProfile,
    updateUserEmail,

    // Logout
    logout,

    // Utility methods
    clearError,
    reauthenticate,
    
    // Validation helpers
    isValidEmail,
    isValidPassword,
    getPasswordStrength,
  };

  return (
    <FirebaseAuthContext.Provider value={contextValue}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

// Hook to use the context
export const useFirebaseAuth = (): AuthContextType => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error(
      "useFirebaseAuth must be used within a FirebaseAuthProvider"
    );
  }
  return context;
};

// Export context for advanced usage
export { FirebaseAuthContext };
