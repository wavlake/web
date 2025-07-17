/**
 * ProfileSetupStep Component
 *
 * Uses the existing EditProfileForm component for profile setup during signup
 */

import React from "react";
import { EditProfileForm } from "@/components/EditProfileForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useCreateNostrAccount } from "@/hooks/auth/useCreateNostrAccount";

interface ProfileSetupStepProps {
  onComplete: (profileData: any) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isArtist: boolean;
  isSoloArtist: boolean;
}

export function ProfileSetupStep({
  onComplete,
  isLoading,
  error,
  isArtist,
  isSoloArtist,
}: ProfileSetupStepProps) {
  const { generatedName } = useCreateNostrAccount();

  const handleProfileComplete = async () => {
    try {
      // The EditProfileForm handles the profile data internally
      // We just need to signal completion
      await onComplete({});
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
      {/* <div className="text-sm text-muted-foreground text-center mb-4">
        {isArtist ? (
          isSoloArtist ? (
            "Set up your artist profile to connect with fans"
          ) : (
            "Set up your band/group profile"
          )
        ) : (
          "Set up your listener profile"
        )}
      </div> */}

      <EditProfileForm
        initialName={generatedName}
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
