/**
 * Signup Flow Component
 *
 * Main flow component for new user signup that manages the state machine
 * and renders appropriate step components.
 */

import { useState } from "react";
import { useSignupFlow } from "@/hooks/auth/flows/useSignupFlow";
import { UserTypeStep } from "../steps/signup/UserTypeStep";
import { ArtistTypeStep } from "../steps/signup/ArtistTypeStep";
import { ProfileSetupStep } from "../steps/signup/ProfileSetupStep";
import { FirebaseEmailStep } from "../steps/shared/FirebaseEmailStep";
import { AccountSummaryStep } from "../steps/shared/AccountSummaryStep";
import { StepWrapper } from "../ui/StepWrapper";

interface SignupFlowProps {
  onComplete: (result: { isArtist: boolean }) => void;
  onCancel?: () => void;
}

export function SignupFlow({ onComplete, onCancel }: SignupFlowProps) {
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);
  
  const {
    stateMachine,
    handleUserTypeSelection,
    handleArtistTypeSelection,
    handleProfileCompletion,
    handleFirebaseAccountCreation,
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
          <FirebaseEmailStep
            variant="backup"
            onComplete={handleFirebaseAccountCreation}
            onSkip={handleFirebaseBackupSkip}
            isLoading={stateMachine.isLoading("createFirebaseAccount")}
            error={errorToString(stateMachine.getError("createFirebaseAccount"))}
          />
        );

      case "email-sent":
        return (
          <div className="text-center space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-primary justify-center mb-2">
                <span className="text-2xl">📧</span>
                <span className="font-medium">Email Sent!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please check your email for a signup link to continue.
              </p>
            </div>
          </div>
        );

      case "complete":
        return (
          <AccountSummaryStep
            onContinue={async () => {
              setIsCompletingSignup(true);
              try {
                await handleSignupCompletion();
                onComplete({ isArtist: stateMachine.isArtist });
              } catch (error) {
                console.error("AccountSummaryStep: Failed to complete signup:", error);
                // Even if completion fails, we can still try to navigate since the user is already set up
                onComplete({ isArtist: stateMachine.isArtist });
              } finally {
                setIsCompletingSignup(false);
              }
            }}
            isLoading={isCompletingSignup}
            currentPubkey={stateMachine.createdLogin?.pubkey || ""}
            displayName={stateMachine.profileData?.name || stateMachine.profileData?.display_name || stateMachine.generatedName || undefined}
            linkedPubkeys={[]}
            isLinked={false}
            firebaseEmail={stateMachine.firebaseUser?.email || undefined}
            hasFirebaseBackup={!!stateMachine.firebaseUser}
            flowType="signup"
            isArtist={stateMachine.isArtist}
          />
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
