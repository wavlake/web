/**
 * Signup Flow Component
 *
 * Main flow component for new user signup that manages the state machine
 * and renders appropriate step components.
 */

import React from "react";
import { useSignupFlow } from "@/hooks/auth/flows/useSignupFlow";
import { UserTypeStep } from "../steps/signup/UserTypeStep";
import { ArtistTypeStep } from "../steps/signup/ArtistTypeStep";
import { ProfileSetupStep } from "../steps/signup/ProfileSetupStep";
import { FirebaseBackupStep } from "../steps/signup/FirebaseBackupStep";
import { StepWrapper } from "../ui/StepWrapper";

interface SignupFlowProps {
  onComplete: (result: { isArtist: boolean }) => void;
  onCancel?: () => void;
}

export function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
  const {
    stateMachine,
    handleUserTypeSelection,
    handleArtistTypeSelection,
    handleProfileCompletion,
    handleFirebaseBackupSetup,
    handleFirebaseBackupSkip,
    handleSignupCompletion,
    getStepTitle,
    getStepDescription,
  } = useSignupFlow();

  // Helper to convert Error to string for legacy components
  const errorToString = (error: Error | null): string | null => 
    error ? error.message : null;

  const renderCurrentStep = () => {
    switch (stateMachine.step) {
      case "user-type":
        return (
          <UserTypeStep
            onComplete={handleUserTypeSelection}
            isLoading={stateMachine.isLoading("setUserType")}
            error={stateMachine.getError("setUserType")}
          />
        );

      case "artist-type":
        return (
          <ArtistTypeStep
            onComplete={handleArtistTypeSelection}
            isLoading={stateMachine.isLoading("setArtistType")}
            error={stateMachine.getError("setArtistType")}
          />
        );

      case "profile-setup":
        return (
          <ProfileSetupStep
            onComplete={handleProfileCompletion}
            isLoading={stateMachine.isLoading("completeProfile")}
            error={errorToString(stateMachine.getError("completeProfile"))}
            isArtist={stateMachine.isArtist}
            isSoloArtist={stateMachine.isSoloArtist}
            createdLogin={stateMachine.createdLogin}
            generatedName={stateMachine.generatedName}
          />
        );

      case "firebase-backup":
        return (
          <FirebaseBackupStep
            onComplete={handleFirebaseBackupSetup}
            onSkip={handleFirebaseBackupSkip}
            isLoading={stateMachine.isLoading("setupFirebaseBackup")}
            error={errorToString(stateMachine.getError("setupFirebaseBackup"))}
          />
        );

      case "complete":
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-600">
              Account Created Successfully!
            </h3>
            <p className="text-muted-foreground">
              Welcome to Wavlake! Your account has been set up and you're ready
              to explore.
            </p>
            <button
              onClick={async () => {
                // Complete the login process first
                try {
                  await handleSignupCompletion();
                  onComplete({ isArtist: stateMachine.isArtist });
                } catch (error) {
                  console.error("Failed to complete signup:", error);
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Continue to App
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <StepWrapper
      title={getStepTitle()}
      description={getStepDescription()}
      canGoBack={stateMachine.canGoBack}
      onBack={stateMachine.goBack}
      onCancel={onCancel}
      // currentStep={stateMachine.step}
      // totalSteps={getTotalSteps()}
    >
      {renderCurrentStep()}
    </StepWrapper>
  );
}
