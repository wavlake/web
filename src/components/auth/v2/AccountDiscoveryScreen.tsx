/**
 * Account Discovery Screen Component
 * 
 * Pure UI component for discovering and selecting linked accounts.
 * All business logic is provided via props - no internal state management.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Loader2, 
  Users, 
  UserPlus, 
  Key, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import type { LinkedAccount, LegacyProfile } from '@/types/authFlow';
import { sortAccountsByPriority } from '@/hooks/auth/useAccountDiscovery';
import { LinkedAccountCard } from './LinkedAccountCard';

// ============================================================================
// Types
// ============================================================================

interface AccountDiscoveryScreenProps {
  /** Firebase user who authenticated */
  firebaseUser: FirebaseUser;
  /** Linked accounts discovered */
  linkedAccounts: LinkedAccount[];
  /** Legacy profile data */
  legacyProfile?: LegacyProfile | null;
  /** Whether discovery is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Called when user selects a linked account */
  onSelectAccount: (pubkey: string) => void;
  /** Called when user wants to use a different account */
  onUseDifferentAccount: () => void;
  /** Called when user wants to generate a new account */
  onGenerateNewAccount: () => void;
  /** Called when user wants to go back */
  onBack: () => void;
  /** Called when user wants to refresh the discovery */
  onRefresh?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AccountDiscoveryScreen Component
 * 
 * A clean, focused component for account discovery that replaces the
 * complex ProfileDiscoveryScreen from the legacy system.
 * 
 * Features:
 * - Pure presentation component (no business logic)
 * - Display linked accounts with profile information
 * - Show legacy profile data when available
 * - Provide options for different account flows
 * - Responsive design with proper loading states
 * 
 * @example
 * ```tsx
 * function AccountDiscoveryContainer() {
 *   const { linkedAccounts, legacyProfile, isLoading, error } = useAccountDiscovery(firebaseUser);
 *   
 *   return (
 *     <AccountDiscoveryScreen
 *       firebaseUser={firebaseUser}
 *       linkedAccounts={linkedAccounts}
 *       legacyProfile={legacyProfile}
 *       isLoading={isLoading}
 *       error={error}
 *       onSelectAccount={(pubkey) => send({ type: 'ACCOUNT_SELECTED', pubkey })}
 *       onUseDifferentAccount={() => send({ type: 'USE_DIFFERENT_ACCOUNT' })}
 *       onGenerateNewAccount={() => send({ type: 'GENERATE_NEW_ACCOUNT' })}
 *       onBack={() => send({ type: 'BACK' })}
 *     />
 *   );
 * }
 * ```
 */
export function AccountDiscoveryScreen({
  firebaseUser,
  linkedAccounts,
  legacyProfile,
  isLoading = false,
  error,
  onSelectAccount,
  onUseDifferentAccount,
  onGenerateNewAccount,
  onBack,
  onRefresh,
}: AccountDiscoveryScreenProps) {
  
  // Sort accounts by priority
  const sortedAccounts = sortAccountsByPriority(linkedAccounts);
  
  // Determine the main content to show
  const hasLinkedAccounts = linkedAccounts.length > 0;
  const hasLegacyProfile = !!legacyProfile;
  const hasMultipleAccounts = linkedAccounts.length > 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-lg mx-auto">
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
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    className="p-2 h-8 w-8"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              
              <CardTitle className="text-center text-xl">
                {hasLinkedAccounts ? 'Choose Your Account' : 'Welcome to Wavlake'}
              </CardTitle>
              <CardDescription className="text-center">
                {hasLinkedAccounts 
                  ? `We found ${linkedAccounts.length} Nostr account${linkedAccounts.length > 1 ? 's' : ''} linked to your email`
                  : 'Let\'s get you set up with a Nostr account'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    {onRefresh && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="ml-2 h-6 px-2"
                      >
                        Retry
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">
                    Loading your accounts...
                  </span>
                </div>
              )}

              {/* Linked Accounts */}
              {!isLoading && hasLinkedAccounts && (
                <div className="space-y-3">
                  {sortedAccounts.map((account) => (
                    <LinkedAccountCard
                      key={account.pubkey}
                      account={account}
                      onSelect={() => onSelectAccount(account.pubkey)}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              )}

              {/* Legacy Profile Info */}
              {!isLoading && hasLegacyProfile && (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Existing Wavlake Profile Found</p>
                      <p className="text-sm">
                        {legacyProfile.displayName || legacyProfile.email}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              {!isLoading && (
                <div className="space-y-2 pt-4">
                  {/* Use Different Account */}
                  <Button
                    onClick={onUseDifferentAccount}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Use Different Nostr Account
                  </Button>

                  {/* Generate New Account */}
                  <Button
                    onClick={onGenerateNewAccount}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Generate New Account
                  </Button>

                  {/* Empty State CTA */}
                  {!hasLinkedAccounts && !hasLegacyProfile && (
                    <Button
                      onClick={onGenerateNewAccount}
                      className="w-full"
                      disabled={isLoading}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Get Started with New Account
                    </Button>
                  )}
                </div>
              )}

              {/* Account Summary */}
              {!isLoading && hasLinkedAccounts && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  {hasMultipleAccounts 
                    ? `Choose from ${linkedAccounts.length} linked accounts`
                    : 'Your linked account is ready to use'
                  }
                </div>
              )}
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
 * Check if account discovery is complete
 */
export function isDiscoveryComplete(
  isLoading: boolean,
  linkedAccounts: LinkedAccount[],
  legacyProfile?: LegacyProfile | null
): boolean {
  return !isLoading && (linkedAccounts.length > 0 || !!legacyProfile);
}