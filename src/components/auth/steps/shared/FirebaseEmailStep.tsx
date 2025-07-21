/**
 * Firebase Email Step Component
 *
 * Unified passwordless Firebase authentication component that handles both
 * login scenarios (existing accounts) and backup scenarios (new accounts).
 * Replaces both FirebaseAuthStep and FirebaseBackupStep with passwordless flow.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, User, LogOut, Mail, Shield, AlertCircle } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

// ============================================================================
// Types
// ============================================================================

interface FirebaseEmailStepProps {
  onComplete: (email: string) => Promise<void>;
  onSkip?: () => Promise<void>;
  onContinueWithExistingUser?: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  variant: 'login' | 'backup';
  title?: string;
  description?: string;
  onCancel?: () => void;
}

interface FormData {
  email: string;
}

interface FormErrors {
  email?: string;
}

// ============================================================================
// Default Content Configuration
// ============================================================================

const VARIANT_CONFIG = {
  login: {
    title: "Sign In to Firebase",
    description: "Enter your email to receive a secure login link",
    buttonText: "Send Login Link",
    loadingText: "Sending login link...",
    showInfoCard: false,
    infoCardProps: {}
  },
  backup: {
    title: "Email Backup (Optional)",
    description: "Add an email to help recover your account if you lose access to your Nostr keys",
    buttonText: "Add Email Backup",
    loadingText: "Setting up backup...",
    showInfoCard: true,
    infoCardProps: {
      icon: Shield,
      title: "Email Backup (Optional)",
      description: "Add an email to help recover your account if you lose access to your Nostr keys. This is especially recommended for artists.",
      className: "border-blue-200 bg-blue-50",
      titleClassName: "text-blue-900",
      descriptionClassName: "text-blue-700",
      iconClassName: "text-blue-600"
    }
  }
} as const;

// ============================================================================
// Component
// ============================================================================

export function FirebaseEmailStep({
  onComplete,
  onSkip,
  onContinueWithExistingUser,
  isLoading,
  error,
  variant,
  title,
  description,
  onCancel,
}: FirebaseEmailStepProps) {
  const { user: firebaseUser, logout: firebaseLogout } = useFirebaseAuth();
  const [formData, setFormData] = useState<FormData>({
    email: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Get configuration for current variant
  const config = VARIANT_CONFIG[variant];
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  // ============================================================================
  // Form Validation
  // ============================================================================

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      email: e.target.value,
    }));

    // Clear email error when user starts typing
    if (formErrors.email) {
      setFormErrors((prev) => ({
        ...prev,
        email: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Store email in localStorage for passwordless completion
    localStorage.setItem('passwordless-email', formData.email);

    await onComplete(formData.email);
  };

  const handleSkip = async () => {
    if (onSkip) {
      await onSkip();
    }
  };

  const handleContinue = async () => {
    if (onContinueWithExistingUser) {
      await onContinueWithExistingUser();
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error("Firebase logout failed:", error);
    }
  };

  // ============================================================================
  // Render Helper Components
  // ============================================================================

  const renderInfoCard = () => {
    if (!config.showInfoCard) return null;

    const { 
      icon: IconComponent, 
      title: cardTitle, 
      description: cardDescription,
      className,
      titleClassName,
      descriptionClassName,
      iconClassName
    } = config.infoCardProps;

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-4 h-4 ${iconClassName}`} />
            <CardTitle className={`text-sm ${titleClassName}`}>{cardTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className={`text-sm ${descriptionClassName}`}>
            {cardDescription}
          </CardDescription>
        </CardContent>
      </Card>
    );
  };

  const renderLoggedInUser = () => {
    if (!firebaseUser) return null;

    const displayName =
      firebaseUser.displayName || firebaseUser.email || "Unknown User";

    return (
      <div className="space-y-4">
        {/* Global Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Logged in user card */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-800">
              <User className="h-5 w-5" />
            </CardTitle>
            <CardDescription className="text-green-700">
              Signed in with {displayName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action buttons */}
            <div className="space-y-2">
              {onContinueWithExistingUser && (
                <Button
                  onClick={handleContinue}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Continuing...
                    </>
                  ) : (
                    "Continue with this account"
                  )}
                </Button>
              )}

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Button */}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    );
  };

  const renderEmailForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Global Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            className={`pl-10 ${formErrors.email ? "border-red-500" : ""}`}
          />
        </div>
        {formErrors.email && (
          <p className="text-sm text-red-500">{formErrors.email}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Primary Action Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {config.loadingText}
            </>
          ) : (
            config.buttonText
          )}
        </Button>

        {/* Skip Button (for backup variant only) */}
        {onSkip && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full"
          >
            Skip for now
          </Button>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  // If user is already logged in and we have continue handler, show continue options
  if (firebaseUser && onContinueWithExistingUser) {
    return renderLoggedInUser();
  }

  // Main form rendering
  return (
    <div className="space-y-4">
      {/* Info Card (for backup variant) */}
      {renderInfoCard()}

      {/* Email Form */}
      {renderEmailForm()}
    </div>
  );
}