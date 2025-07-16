import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  User as UserIcon,
  CheckCircle,
  XCircle,
  LogOut,
} from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useLegacyMetadata } from "@/hooks/useLegacyApi";
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
    user,
    loginWithEmailAndPassword,
    registerWithEmailAndPassword,
    logout,
    loading,
    error: firebaseError,
    isValidEmail,
    isValidPassword,
    getPasswordStrength,
  } = useFirebaseAuth();

  const [isCompletionLoading, setIsCompletionLoading] = useState(false);

  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
    fieldErrors: {},
  });

  // Helper function to get user initials for avatar
  const getUserInitials = (
    name: string | null,
    email: string | null
  ): string => {
    if (name) {
      return name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Helper function to format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Update form state
  const updateFormState = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  // Use legacy metadata hook
  const { data: legacyMetadata, isLoading: isLegacyLoading } =
    useLegacyMetadata();

  // If user is logged in, show the logged-in state
  if (user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Signed in
        </div>
        <div className="flex items-center gap-3 space-y-4">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={
                legacyMetadata?.user?.artwork_url || user.photoURL || undefined
              }
              alt={legacyMetadata?.user?.name || user.displayName || "User"}
            />
            <AvatarFallback>
              {getUserInitials(
                legacyMetadata?.user?.name || user.displayName,
                user.email
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {legacyMetadata?.user?.name && (
              <div className="font-medium">{legacyMetadata?.user?.name}</div>
            )}
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
        {/* Account Status */}
        <div className="flex items-center gap-2">
          <Badge variant={user.emailVerified ? "default" : "secondary"}>
            {user.emailVerified ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Email Verified
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Unverified Email
              </>
            )}
          </Badge>
          <Badge variant="outline">
            {user.providerData.length > 0
              ? user.providerData[0].providerId
              : "password"}
          </Badge>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {onComplete && (
            <Button
              onClick={() => onComplete(user)}
              className="w-full rounded-full py-6"
              disabled={loading}
            >
              Continue
            </Button>
          )}
          <Button
            variant="outline"
            onClick={logout}
            className="w-full rounded-full py-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

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
      const result =
        mode === "signin"
          ? await loginWithEmailAndPassword({
              email: formState.email,
              password: formState.password,
            })
          : await registerWithEmailAndPassword({
              email: formState.email,
              password: formState.password,
            });

      // Handle onComplete callback with loading state
      if (onComplete && result.user) {
        setIsCompletionLoading(true);
        await onComplete(result.user);
        setIsCompletionLoading(false);
      }
    } catch (error) {
      setIsCompletionLoading(false);
      // Error is already handled by the hook
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
      {(error || firebaseError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || firebaseError?.message}</AlertDescription>
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
            disabled={isLoading || loading || isCompletionLoading}
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
              disabled={isLoading || loading || isCompletionLoading}
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
              disabled={isLoading || loading || isCompletionLoading}
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
                disabled={isLoading || loading || isCompletionLoading}
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
                disabled={isLoading || loading || isCompletionLoading}
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
          disabled={isLoading || loading || isCompletionLoading || !isFormValid}
        >
          {(isLoading || loading || isCompletionLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isLoading || loading
            ? "Authenticating..."
            : isCompletionLoading
            ? "Completing setup..."
            : content.submitText}
        </Button>
      </form>
    </div>
  );
}
