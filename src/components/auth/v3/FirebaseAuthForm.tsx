import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
} from "@/hooks/auth/useFirebaseAuthentication";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { User } from "firebase/auth";

interface FirebaseAuthFormProps {
  /** Whether authentication is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Initial mode (signin or signup) */
  mode: "signin" | "signup";
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  onComplete?: (user: User) => void | Promise<void>;
}

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  fieldErrors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

export function FirebaseAuthForm({
  isLoading = false,
  error,
  mode = "signin",
  title,
  description,
  onComplete,
}: FirebaseAuthFormProps) {
  const {
    isLoading: isFirebaseAuthLoading,
    error: firebaseError,
    setError: setFirebaseError,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
  } = useFirebaseLegacyAuth();

  const [isCompletionLoading, setIsCompletionLoading] = useState(false);

  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
    fieldErrors: {},
  });

  // Update form state
  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  // Real-time validation
  const validateField = (
    field: keyof FormState["fieldErrors"],
    value: string
  ) => {
    let error: string | undefined;

    switch (field) {
      case "email":
        if (!isValidEmail(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "password":
        if (mode === "signup" && !isValidPassword(value, true)) {
          error = "Password must be at least 6 characters long";
        } else if (mode === "signin" && !value.trim()) {
          error = "Password is required";
        }
        break;
      case "confirmPassword":
        if (mode === "signup" && value !== formState.password) {
          error = "Passwords do not match";
        }
        break;
    }

    updateFormState({
      fieldErrors: { ...formState.fieldErrors, [field]: error },
    });
  };

  // Handle input changes
  const handleEmailChange = (value: string) => {
    updateFormState({ email: value });
    validateField("email", value);
  };

  const handlePasswordChange = (value: string) => {
    updateFormState({ password: value });
    validateField("password", value);

    // Revalidate confirm password if it was entered
    if (mode === "signup" && formState.confirmPassword) {
      validateField("confirmPassword", formState.confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    updateFormState({ confirmPassword: value });
    validateField("confirmPassword", value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    validateField("email", formState.email);
    validateField("password", formState.password);
    if (mode === "signup") {
      validateField("confirmPassword", formState.confirmPassword);
    }

    // Check if form is valid
    const hasErrors = Object.values(formState.fieldErrors).some(
      (error) => !!error
    );
    if (hasErrors) return;

    try {
      const newUser =
        mode === "signin"
          ? await handleFirebaseEmailLogin(formState.email, formState.password)
          : await handleFirebaseEmailSignup(formState.email, formState.password);

      // Handle onComplete callback with loading state
      if (onComplete) {
        setIsCompletionLoading(true);
        await onComplete(newUser);
        setIsCompletionLoading(false);
      }
    } catch (error) {
      setIsCompletionLoading(false);
      throw error; // Re-throw to let Firebase hook handle the error
    }
  };

  // Check if form is valid
  const isFormValid =
    isValidEmail(formState.email) &&
    isValidPassword(formState.password, mode === "signup") &&
    (mode === "signin" || formState.password === formState.confirmPassword);

  // Get password strength for display
  const passwordStrength = getPasswordStrength(formState.password);

  // Dynamic content based on mode
  const modeContent = {
    signin: {
      title: title || "Sign in to Wavlake",
      description: description || "Use your existing email and password",
      submitText: "Sign In",
      switchText: "Don't have an account? Sign up",
      switchAction: "Sign Up",
    },
    signup: {
      title: title || "Create Wavlake account",
      description: description || "Create a new account with your email",
      submitText: "Create Account",
      switchText: "Already have an account? Sign in",
      switchAction: "Sign In",
    },
  };

  const content = modeContent[mode];

  return (
    <div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formState.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoading || isFirebaseAuthLoading || isCompletionLoading}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            className={formState.fieldErrors.email ? "border-destructive" : ""}
          />
          {formState.fieldErrors.email && (
            <p className="text-sm text-destructive">
              {formState.fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={formState.showPassword ? "text" : "password"}
              value={formState.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading || isFirebaseAuthLoading || isCompletionLoading}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className={
                formState.fieldErrors.password
                  ? "border-destructive pr-10"
                  : "pr-10"
              }
            />
            <button
              type="button"
              onClick={() =>
                updateFormState({
                  showPassword: !formState.showPassword,
                })
              }
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isLoading || isFirebaseAuthLoading || isCompletionLoading}
            >
              {formState.showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {formState.fieldErrors.password && (
            <p className="text-sm text-destructive">
              {formState.fieldErrors.password}
            </p>
          )}

          {/* Password Strength Indicator */}
          {mode === "signup" && formState.password && (
            <div className="flex items-center gap-2 text-xs">
              <span>Strength:</span>
              <span
                className={`font-medium ${
                  passwordStrength === "weak"
                    ? "text-destructive"
                    : passwordStrength === "medium"
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                {passwordStrength.charAt(0).toUpperCase() +
                  passwordStrength.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password Field (Sign Up Only) */}
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={formState.showConfirmPassword ? "text" : "password"}
                value={formState.confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading || isFirebaseAuthLoading || isCompletionLoading}
                autoComplete="new-password"
                className={
                  formState.fieldErrors.confirmPassword
                    ? "border-destructive pr-10"
                    : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() =>
                  updateFormState({
                    showConfirmPassword: !formState.showConfirmPassword,
                  })
                }
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading || isFirebaseAuthLoading || isCompletionLoading}
              >
                {formState.showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formState.fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">
                {formState.fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || isFirebaseAuthLoading || isCompletionLoading || !isFormValid}
        >
          {(isLoading || isFirebaseAuthLoading || isCompletionLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isLoading || isFirebaseAuthLoading
            ? "Authenticating..."
            : isCompletionLoading
            ? "Completing setup..."
            : content.submitText}
        </Button>
      </form>
    </div>
  );
}
