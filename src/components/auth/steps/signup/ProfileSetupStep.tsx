/**
 * ProfileSetupStep Component
 *
 * Uses the SignupProfileForm component for profile setup during signup.
 * This component works without requiring a logged-in user by using the
 * createdLogin object directly from the state machine.
 */

import { SignupProfileForm } from "./SignupProfileForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Sparkles, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type NLoginType } from "@nostrify/react/login";
import { type ProfileData } from "@/types/profile";
import { NostrCredentials } from "@/types/authFlow";
import { NostrAuthTabs } from "../../ui/NostrAuthTabs";
import { AuthLoadingStates, AuthErrors } from "../../types";
import { useState, useEffect } from "react";

interface ProfileSetupStepProps {
  onComplete: (profileData: ProfileData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isArtist: boolean;
  isSoloArtist: boolean;
  createdLogin: NLoginType | null;
  generatedName: string | null;
  // Optional account generation for users without createdLogin
  onGenerateAccount?: () => Promise<void>;
  onSignInWithExisting?: (credentials: NostrCredentials) => Promise<void>;
  isGenerating?: boolean;
  generateError?: string | null;
}

export function ProfileSetupStep({
  onComplete,
  isLoading,
  error,
  isArtist,
  isSoloArtist,
  createdLogin,
  generatedName,
  onGenerateAccount,
  onSignInWithExisting,
  isGenerating = false,
  generateError = null,
}: ProfileSetupStepProps) {
  const [showExistingAuth, setShowExistingAuth] = useState(false);
  const [authLoadingStates, setAuthLoadingStates] = useState<AuthLoadingStates>(
    {
      extension: false,
      nsec: false,
      bunker: false,
    }
  );
  const [authErrors, setAuthErrors] = useState<AuthErrors>({
    extension: null,
    nsec: null,
    bunker: null,
  });

  // Auto-generate account if no login exists and onGenerateAccount is provided
  useEffect(() => {
    if (!createdLogin && !isGenerating && onGenerateAccount && !generateError) {
      onGenerateAccount().catch((err) => {
        console.error("Failed to auto-generate account:", err);
      });
    }
  }, [createdLogin, isGenerating, onGenerateAccount, generateError]);
  const handleProfileComplete = async (profileData: ProfileData) => {
    try {
      await onComplete(profileData);
    } catch (err) {
      console.error(
        "❌ [ProfileSetupStep] Failed to complete profile setup:",
        err
      );
    }
  };

  // Handle existing Nostr authentication methods
  const handleExtensionAuth = async () => {
    if (!onSignInWithExisting) return;
    setAuthLoadingStates((prev) => ({ ...prev, extension: true }));
    setAuthErrors((prev) => ({ ...prev, extension: null }));
    try {
      await onSignInWithExisting({ method: "extension" });
    } catch (error) {
      setAuthErrors((prev) => ({
        ...prev,
        extension:
          error instanceof Error
            ? error
            : new Error("Extension authentication failed"),
      }));
    } finally {
      setAuthLoadingStates((prev) => ({ ...prev, extension: false }));
    }
  };

  const handleNsecAuth = async (nsecValue: string) => {
    if (!onSignInWithExisting) return;
    setAuthLoadingStates((prev) => ({ ...prev, nsec: true }));
    setAuthErrors((prev) => ({ ...prev, nsec: null }));
    try {
      await onSignInWithExisting({ method: "nsec", nsec: nsecValue });
    } catch (error) {
      setAuthErrors((prev) => ({
        ...prev,
        nsec:
          error instanceof Error
            ? error
            : new Error("Nsec authentication failed"),
      }));
    } finally {
      setAuthLoadingStates((prev) => ({ ...prev, nsec: false }));
    }
  };

  const handleBunkerAuth = async (bunkerUri: string) => {
    if (!onSignInWithExisting) return;
    setAuthLoadingStates((prev) => ({ ...prev, bunker: true }));
    setAuthErrors((prev) => ({ ...prev, bunker: null }));
    try {
      await onSignInWithExisting({ method: "bunker", bunkerUri });
    } catch (error) {
      setAuthErrors((prev) => ({
        ...prev,
        bunker:
          error instanceof Error
            ? error
            : new Error("Bunker authentication failed"),
      }));
    } finally {
      setAuthLoadingStates((prev) => ({ ...prev, bunker: false }));
    }
  };

  // Show account generation loading state
  if (isGenerating || (!createdLogin && onGenerateAccount && !generateError)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading</p>
        </div>
      </div>
    );
  }

  // Show account generation error
  if (generateError && !createdLogin) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generateError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Show account creation success message when account was just generated */}
      {createdLogin && onGenerateAccount && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">
              Nostr account created successfully!
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your secure keypair has been generated. Set up your profile below.
          </p>
        </div>
      )}

      {/* Show context based on user type */}
      <div className="text-sm text-muted-foreground text-center mb-4">
        {isArtist
          ? isSoloArtist
            ? "Set up your artist profile to connect with fans"
            : "Set up your band/group profile"
          : "Set up your listener profile"}
      </div>

      <SignupProfileForm
        createdLogin={createdLogin}
        generatedName={generatedName}
        onComplete={handleProfileComplete}
      />

      {/* Show "Sign in with existing account instead" option for account generation flows */}
      {onSignInWithExisting && createdLogin && (
        <div className="pt-4 border-t">
          <Collapsible
            open={showExistingAuth}
            onOpenChange={setShowExistingAuth}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between"
                type="button"
              >
                <span className="text-sm text-muted-foreground">
                  Already have a Nostr account? Sign in instead
                </span>
                <Key className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="border rounded-lg p-4 bg-muted/50">
                <NostrAuthTabs
                  onExtensionAuth={handleExtensionAuth}
                  onNsecAuth={handleNsecAuth}
                  onBunkerAuth={handleBunkerAuth}
                  loadingStates={authLoadingStates}
                  errors={authErrors}
                  externalLoading={isLoading}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Saving your profile...
        </div>
      )}
    </div>
  );
}
