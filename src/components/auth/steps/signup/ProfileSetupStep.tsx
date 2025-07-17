/**
 * ProfileSetupStep Component
 *
 * Uses the SignupProfileForm component for profile setup during signup.
 * This component works without requiring a logged-in user by using the
 * createdLogin object directly from the state machine.
 */

import { SignupProfileForm } from "./SignupProfileForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { type NLoginType } from "@nostrify/react/login";

interface ProfileSetupStepProps {
  onComplete: (profileData: any) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isArtist: boolean;
  isSoloArtist: boolean;
  createdLogin: NLoginType | null;
  generatedName: string | null;
}

export function ProfileSetupStep({
  onComplete,
  isLoading,
  error,
  isArtist,
  isSoloArtist,
  createdLogin,
  generatedName,
}: ProfileSetupStepProps) {
  const handleProfileComplete = async (profileData: any) => {
    try {
      await onComplete(profileData);
    } catch (err) {
      console.error("Failed to complete profile setup:", err);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Show context based on user type */}
      <div className="text-sm text-muted-foreground text-center mb-4">
        {isArtist ? (
          isSoloArtist ? (
            "Set up your artist profile to connect with fans"
          ) : (
            "Set up your band/group profile"
          )
        ) : (
          "Set up your listener profile"
        )}
      </div>

      <SignupProfileForm
        createdLogin={createdLogin}
        generatedName={generatedName}
        onComplete={handleProfileComplete}
      />

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Saving your profile...
        </div>
      )}
    </div>
  );
}
