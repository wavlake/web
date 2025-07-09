import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ChevronRight, Loader2, Users, UserPlus, Key } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { useLinkedPubkeys } from "@/hooks/legacy/useLegacyLinkedPubkeys";
import { useLegacyProfile } from "@/hooks/useLegacyProfile";
import { useAuthor } from "@/hooks/useAuthor";

interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
    nip05?: string;
  } | null;
  linkedAt?: number;
  isPrimary?: boolean;
}

interface ProfileDiscoveryScreenProps {
  firebaseUser: FirebaseUser;
  onBack: () => void;
  onSelectPubkey: (pubkey: string) => void;
  onUseDifferentAccount: () => void;
  onGenerateNewAccount: () => void;
  /** Skip API calls for new users during signup flow */
  isNewUser?: boolean;
}

/**
 * Profile discovery screen shown after successful Firebase authentication
 * 
 * This component handles the discovery and selection of linked Nostr accounts
 * based on the enhanced authentication flows documented in ENHANCED_AUTH_UX_FLOWS.md
 * 
 * Performance optimization: For new users during signup flow, API calls to
 * check for linked pubkeys and legacy profiles are skipped via the isNewUser flag,
 * reducing unnecessary requests and improving signup performance.
 */
export function ProfileDiscoveryScreen({
  firebaseUser,
  onBack,
  onSelectPubkey,
  onUseDifferentAccount,
  onGenerateNewAccount,
  isNewUser = false,
}: ProfileDiscoveryScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Skip API calls for new users during signup flow to optimize performance
  const { 
    data: linkedPubkeys, 
    isLoading: isLoadingLinked, 
    error: linkedError 
  } = useLinkedPubkeys(isNewUser ? undefined : firebaseUser);

  const { 
    data: legacyProfile, 
    isLoading: isLoadingLegacy 
  } = useLegacyProfile(isNewUser ? undefined : firebaseUser);

  const isLoading = isLoadingLinked || isLoadingLegacy;

  // Handle account generation with loading state
  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      onGenerateNewAccount();
    } finally {
      setIsGenerating(false);
    }
  };

  // Show loading state while fetching data (skip for new users)
  if (!isNewUser && isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md mx-auto text-center space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold">Checking Your Accounts</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Looking for linked Nostr accounts...
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Searching for your linked accounts...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (linkedError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md mx-auto">

          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Error Loading Accounts</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Unable to check for linked accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  {linkedError.message}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <Button onClick={onUseDifferentAccount} className="w-full" size="lg">
                  Sign in with Nostr Account
                </Button>
                <Button onClick={onBack} variant="outline" className="w-full" size="lg">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Flow 2: User has linked pubkeys - show profile selection (skip for new users)
  if (!isNewUser && linkedPubkeys && linkedPubkeys.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-lg mx-auto">

          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Users className="w-5 h-5" />
                Welcome back!
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                We found {linkedPubkeys.length} linked account{linkedPubkeys.length > 1 ? 's' : ''} for your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Linked accounts list */}
              <div className="space-y-3">
                {linkedPubkeys.map((account) => (
                  <LinkedAccountCard
                    key={account.pubkey}
                    account={account}
                    onSelect={() => onSelectPubkey(account.pubkey)}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={onUseDifferentAccount}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Use different Nostr account
                </Button>
                
                <Button
                  onClick={handleGenerateNew}
                  variant="outline"
                  className="w-full"
                  disabled={isGenerating}
                  size="lg"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Generate new account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Flow 3: No linked pubkeys found - show setup options
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md mx-auto">
        <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">
              {isNewUser ? "Welcome to Wavlake!" : "Welcome back!"}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isNewUser 
                ? "Let's get you set up with a Nostr account:"
                : "No Nostr accounts found. Let's get you set up:"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show legacy profile preview if available (skip for new users) */}
            {!isNewUser && legacyProfile && (
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Your Wavlake Profile:</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={legacyProfile.picture} />
                    <AvatarFallback>
                      {legacyProfile.name[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{legacyProfile.name}</p>
                    {legacyProfile.about && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {legacyProfile.about}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Recommended: Generate new account */}
              <Button
                onClick={handleGenerateNew}
                className="w-full"
                disabled={isGenerating}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Generate new account
                  </>
                )}
              </Button>
              
              {!isNewUser && legacyProfile && (
                <p className="text-xs text-center text-muted-foreground">
                  Recommended: Uses your existing profile information
                </p>
              )}

              {/* Alternative: Use existing account */}
              <Button
                onClick={onUseDifferentAccount}
                variant="outline"
                className="w-full"
                disabled={isGenerating}
                size="lg"
              >
                <Key className="w-4 h-4 mr-2" />
                Use existing Nostr account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Component for displaying individual linked accounts with profile information
 */
function LinkedAccountCard({
  account,
  onSelect,
}: {
  account: LinkedPubkey;
  onSelect: () => void;
}) {
  // Use the existing useAuthor hook to get profile data
  const author = useAuthor(account.pubkey);
  const profile = author.data?.metadata || account.profile;

  const displayName = profile?.name || profile?.display_name || "Unnamed Account";
  const pubkeyDisplay = `${account.pubkey.slice(0, 8)}...${account.pubkey.slice(-8)}`;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors"
      onClick={onSelect}
    >
      <CardContent className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarImage src={profile?.picture} />
          <AvatarFallback>
            {displayName[0]?.toUpperCase() || account.pubkey.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm sm:text-base truncate">{displayName}</p>
            {account.isPrimary && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded shrink-0">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">{pubkeyDisplay}</p>
          {profile?.about && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {profile.about}
            </p>
          )}
        </div>
        
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
}