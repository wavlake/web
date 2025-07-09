/**
 * Auth Method Selector Component
 * 
 * Pure UI component for selecting authentication method.
 * All business logic is provided via props - no internal state management.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, Mail, Key } from 'lucide-react';
import type { AuthMethod } from '@/types/authFlow';

// ============================================================================
// Types
// ============================================================================

interface AuthMethodSelectorProps {
  /** Called when user selects an authentication method */
  onSelectMethod: (method: AuthMethod) => void;
  /** Whether any method is currently loading */
  isLoading?: boolean;
  /** Optional error message to display */
  error?: string;
  /** Custom title for the selector */
  title?: string;
  /** Custom description for the selector */
  description?: string;
  /** Whether to show the create account option */
  showCreateAccount?: boolean;
}

interface AuthMethodOption {
  method: AuthMethod;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  variant?: 'default' | 'primary';
}

// ============================================================================
// Configuration
// ============================================================================

const AUTH_METHODS: AuthMethodOption[] = [
  {
    method: 'create-account',
    icon: Sparkles,
    title: 'Get Started',
    description: 'New to Wavlake? We\'ll create an account for you',
    variant: 'primary',
  },
  {
    method: 'firebase',
    icon: Mail,
    title: 'I have a Wavlake account',
    description: 'Sign in with your existing email address',
  },
  {
    method: 'nostr',
    icon: Key,
    title: 'I have a Nostr account',
    description: 'Sign in with your existing Nostr keys',
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * AuthMethodSelector Component
 * 
 * A clean, focused component for selecting authentication methods.
 * This replaces the complex method selection logic embedded in the legacy Index.tsx.
 * 
 * Features:
 * - Pure presentation component (no business logic)
 * - Clear visual hierarchy
 * - Responsive design
 * - Accessible interactions
 * - Customizable content
 * 
 * @example
 * ```tsx
 * function AuthFlow() {
 *   const { send } = useAuthFlow();
 *   
 *   return (
 *     <AuthMethodSelector
 *       onSelectMethod={(method) => {
 *         if (method === 'nostr') send({ type: 'SELECT_NOSTR' });
 *         if (method === 'firebase') send({ type: 'SELECT_FIREBASE' });
 *         if (method === 'create-account') send({ type: 'SELECT_CREATE_ACCOUNT' });
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function AuthMethodSelector({
  onSelectMethod,
  isLoading = false,
  error,
  title = 'Welcome to Wavlake',
  description = 'Choose how you\'d like to get started',
  showCreateAccount = true,
}: AuthMethodSelectorProps) {
  
  // Filter methods based on configuration
  const visibleMethods = AUTH_METHODS.filter(method => 
    showCreateAccount || method.method !== 'create-account'
  );

  const handleMethodClick = (method: AuthMethod) => {
    if (isLoading) return;
    onSelectMethod(method);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile-optimized layout */}
      <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-8">
        {/* Header - more compact on mobile */}
        <div className="w-full max-w-xs sm:max-w-md mx-auto text-center mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <img
              src="/wavlake-icon-96.png"
              alt="Wavlake"
              width={48}
              height={48}
              className="object-contain sm:w-16 sm:h-16"
            />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              Wavlake
            </h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground">
            Stream Anywhere, Earn Everywhere
          </p>
        </div>

        {/* Authentication Options - wider on mobile */}
        <div className="w-full max-w-xs sm:max-w-md mx-auto px-4 sm:px-0">
          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-center text-lg sm:text-xl">
                {title}
              </CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                {description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {/* Error Display */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                </div>
              )}

              {/* Method Buttons */}
              {visibleMethods.map((method) => {
                const IconComponent = method.icon;
                
                return (
                  <Button
                    key={method.method}
                    onClick={() => handleMethodClick(method.method)}
                    variant={method.variant === 'primary' ? 'default' : 'outline'}
                    disabled={isLoading}
                    className={`w-full h-auto py-4 sm:py-4 px-4 sm:px-4 rounded-xl text-left border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      method.variant === 'primary' 
                        ? 'hover:bg-primary/90 active:bg-primary/80' 
                        : 'hover:bg-muted/50 active:bg-muted/70'
                    }`}
                    size="lg"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <IconComponent className={`w-5 h-5 shrink-0 ${method.variant === 'primary' ? 'text-primary-foreground' : 'text-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base sm:text-base">
                          {method.title}
                        </div>
                        <div className="text-sm sm:text-sm text-muted-foreground mt-1 leading-tight break-words">
                          {method.description}
                        </div>
                      </div>
                      {isLoading && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get method display information
 */
export function getMethodInfo(method: AuthMethod): AuthMethodOption | undefined {
  return AUTH_METHODS.find(m => m.method === method);
}

/**
 * Check if method is available
 */
export function isMethodAvailable(method: AuthMethod): boolean {
  if (method === 'nostr') {
    // Check if Nostr extension is available
    return typeof window !== 'undefined' && 'nostr' in window;
  }
  
  return true; // Firebase and create-account are always available
}

/**
 * Get available methods based on environment
 */
export function getAvailableMethods(): AuthMethod[] {
  return AUTH_METHODS
    .filter(method => isMethodAvailable(method.method))
    .map(method => method.method);
}