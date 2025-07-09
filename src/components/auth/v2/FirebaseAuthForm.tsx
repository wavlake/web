/**
 * Firebase Authentication Form Component
 * 
 * Pure UI component for Firebase email/password authentication.
 * All business logic is provided via props - no internal state management.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { 
  isValidEmail, 
  isValidPassword, 
  getPasswordStrength 
} from '@/hooks/auth/useFirebaseAuthentication';

// ============================================================================
// Types
// ============================================================================

interface FirebaseAuthFormProps {
  /** Called when authentication is attempted */
  onAuthenticate: (email: string, password: string, isSignUp: boolean) => Promise<void>;
  /** Called when user wants to go back */
  onBack: () => void;
  /** Whether authentication is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Initial mode (signin or signup) */
  initialMode?: 'signin' | 'signup';
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  mode: 'signin' | 'signup';
  showPassword: boolean;
  showConfirmPassword: boolean;
  fieldErrors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * FirebaseAuthForm Component
 * 
 * A clean, focused component for Firebase email/password authentication.
 * This extracts the form logic from the legacy FirebaseAuthForm and provides
 * a pure presentation component.
 * 
 * Features:
 * - Pure presentation component (no business logic)
 * - Sign-in and sign-up modes
 * - Real-time validation feedback
 * - Password strength indicator
 * - Show/hide password functionality
 * - Responsive design
 * 
 * @example
 * ```tsx
 * function FirebaseAuthScreen() {
 *   const { signIn, signUp, isLoading, error } = useFirebaseAuthentication();
 *   
 *   return (
 *     <FirebaseAuthForm
 *       onAuthenticate={async (email, password, isSignUp) => {
 *         const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
 *         onSuccess(result.user, result.isNewUser);
 *       }}
 *       onBack={() => send({ type: 'BACK' })}
 *       isLoading={isLoading}
 *       error={error}
 *     />
 *   );
 * }
 * ```
 */
export function FirebaseAuthForm({
  onAuthenticate,
  onBack,
  isLoading = false,
  error,
  initialMode = 'signin',
  title,
  description,
}: FirebaseAuthFormProps) {
  
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    mode: initialMode,
    showPassword: false,
    showConfirmPassword: false,
    fieldErrors: {},
  });

  // Update form state
  const updateFormState = (updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  // Real-time validation
  const validateField = (field: keyof FormState['fieldErrors'], value: string) => {
    let error: string | undefined;

    switch (field) {
      case 'email':
        if (!isValidEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (formState.mode === 'signup' && !isValidPassword(value, true)) {
          error = 'Password must be at least 6 characters long';
        } else if (formState.mode === 'signin' && !value.trim()) {
          error = 'Password is required';
        }
        break;
      case 'confirmPassword':
        if (formState.mode === 'signup' && value !== formState.password) {
          error = 'Passwords do not match';
        }
        break;
    }

    updateFormState({
      fieldErrors: { ...formState.fieldErrors, [field]: error }
    });
  };

  // Handle input changes
  const handleEmailChange = (value: string) => {
    updateFormState({ email: value });
    validateField('email', value);
  };

  const handlePasswordChange = (value: string) => {
    updateFormState({ password: value });
    validateField('password', value);
    
    // Revalidate confirm password if it was entered
    if (formState.mode === 'signup' && formState.confirmPassword) {
      validateField('confirmPassword', formState.confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    updateFormState({ confirmPassword: value });
    validateField('confirmPassword', value);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    validateField('email', formState.email);
    validateField('password', formState.password);
    if (formState.mode === 'signup') {
      validateField('confirmPassword', formState.confirmPassword);
    }

    // Check if form is valid
    const hasErrors = Object.values(formState.fieldErrors).some(error => !!error);
    if (hasErrors) return;

    await onAuthenticate(formState.email, formState.password, formState.mode === 'signup');
  };

  // Toggle mode
  const toggleMode = () => {
    updateFormState({
      mode: formState.mode === 'signin' ? 'signup' : 'signin',
      fieldErrors: {}, // Clear errors when switching modes
    });
  };

  // Check if form is valid
  const isFormValid = 
    isValidEmail(formState.email) &&
    isValidPassword(formState.password, formState.mode === 'signup') &&
    (formState.mode === 'signin' || formState.password === formState.confirmPassword);

  // Get password strength for display
  const passwordStrength = getPasswordStrength(formState.password);

  // Dynamic content based on mode
  const modeContent = {
    signin: {
      title: title || 'Sign in to Wavlake',
      description: description || 'Use your existing email and password',
      submitText: 'Sign In',
      switchText: 'Don\'t have an account? Sign up',
      switchAction: 'Sign Up',
    },
    signup: {
      title: title || 'Create Wavlake account',
      description: description || 'Create a new account with your email',
      submitText: 'Create Account',
      switchText: 'Already have an account? Sign in',
      switchAction: 'Sign In',
    },
  };

  const content = modeContent[formState.mode];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md mx-auto">
          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="p-2 h-8 w-8"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
              </div>
              
              <CardTitle className="text-center text-xl">
                {content.title}
              </CardTitle>
              <CardDescription className="text-center">
                {content.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formState.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="your@email.com"
                    disabled={isLoading}
                    className={formState.fieldErrors.email ? 'border-destructive' : ''}
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
                      type={formState.showPassword ? 'text' : 'password'}
                      value={formState.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className={formState.fieldErrors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => updateFormState({ showPassword: !formState.showPassword })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      {formState.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formState.fieldErrors.password && (
                    <p className="text-sm text-destructive">
                      {formState.fieldErrors.password}
                    </p>
                  )}
                  
                  {/* Password Strength Indicator */}
                  {formState.mode === 'signup' && formState.password && (
                    <div className="flex items-center gap-2 text-xs">
                      <span>Strength:</span>
                      <span className={`font-medium ${
                        passwordStrength === 'weak' ? 'text-destructive' :
                        passwordStrength === 'medium' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field (Sign Up Only) */}
                {formState.mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={formState.showConfirmPassword ? 'text' : 'password'}
                        value={formState.confirmPassword}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                        className={formState.fieldErrors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => updateFormState({ showConfirmPassword: !formState.showConfirmPassword })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                      >
                        {formState.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? 'Please wait...' : content.submitText}
                </Button>
              </form>

              {/* Mode Toggle */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {content.switchText}
                </p>
                <Button
                  variant="link"
                  onClick={toggleMode}
                  disabled={isLoading}
                  className="p-0 h-auto font-normal"
                >
                  {content.switchAction}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}