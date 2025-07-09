import { useState, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { toast } from "sonner";

export interface FirebaseAuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface FirebaseAuthFormOptions {
  showSuccessToast?: boolean;
  onSuccess?: (user: FirebaseUser, isNewUser?: boolean) => void;
}

export function useFirebaseAuthForm(options: FirebaseAuthFormOptions = {}) {
  const { showSuccessToast = true, onSuccess } = options;

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [formData, setFormData] = useState<FirebaseAuthFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const {
    isLoading: isFirebaseAuthLoading,
    error: firebaseError,
    setError: setFirebaseError,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
  } = useFirebaseLegacyAuth();

  const updateFormData = useCallback(
    (updates: Partial<FirebaseAuthFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const clearForm = useCallback(() => {
    setFormData({ email: "", password: "", confirmPassword: "" });
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.email || !formData.password) {
      setFirebaseError("Please fill in all fields");
      return false;
    }

    if (
      authMode === "signup" &&
      formData.password !== formData.confirmPassword
    ) {
      setFirebaseError("Passwords do not match");
      return false;
    }

    return true;
  }, [formData, authMode, setFirebaseError]);

  const handleSubmit = useCallback(async (): Promise<FirebaseUser | null> => {
    if (!validateForm()) {
      return null;
    }

    try {
      let user: FirebaseUser;

      if (authMode === "signup") {
        user = await handleFirebaseEmailSignup(
          formData.email,
          formData.password
        );
        if (showSuccessToast) {
          toast.success("Account created successfully");
        }
        clearForm();
        onSuccess?.(user, true); // Pass true for new users
        return user;
      } else {
        user = await handleFirebaseEmailLogin(
          formData.email,
          formData.password
        );
        if (showSuccessToast) {
          toast.success("Successfully signed in to your Wavlake account");
        }
        clearForm();
        onSuccess?.(user, false); // Pass false for existing users
        return user;
      }
    } catch (error) {
      console.error("Firebase authentication error:", error);
      if (showSuccessToast) {
        toast.error(
          error instanceof Error ? error.message : "Authentication failed"
        );
      }
      return null;
    }
  }, [
    validateForm,
    authMode,
    formData,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
    showSuccessToast,
    clearForm,
    onSuccess,
  ]);

  return {
    // Form state
    authMode,
    setAuthMode,
    formData,
    updateFormData,
    clearForm,

    // Firebase auth state
    isLoading: isFirebaseAuthLoading,
    error: firebaseError,
    setError: setFirebaseError,

    // Form actions
    handleSubmit,
  };
}
