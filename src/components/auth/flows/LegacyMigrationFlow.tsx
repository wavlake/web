/**
 * Legacy Migration Flow Component
 *
 * Complex flow component for legacy account migration that handles
 * multiple steps and branching logic.
 */

import React from "react";
import { useLegacyMigrationFlow } from "@/hooks/auth/flows/useLegacyMigrationFlow";
import { FirebaseAuthStep } from "../steps/legacy/FirebaseAuthStep";
import { CheckingLinksStep } from "../steps/legacy/CheckingLinksStep";
import { LinkedNostrAuthStep } from "../steps/legacy/LinkedNostrAuthStep";
import { AccountChoiceStep } from "../steps/legacy/AccountChoiceStep";
import { AccountGenerationStep } from "../steps/legacy/AccountGenerationStep";
import { BringKeypairStep } from "../steps/legacy/BringKeypairStep";
import { ProfileSetupStep } from "../steps/signup/ProfileSetupStep";
import { LoadingStep } from "../steps/shared/LoadingStep";
import { StepWrapper } from "../ui/StepWrapper";

interface AuthFlowResult {
  success: boolean;
  error?: string;
}

interface LegacyMigrationFlowProps {
  onComplete: (result: AuthFlowResult) => void;
  onCancel?: () => void;
}

export function LegacyMigrationFlow({
  onComplete,
  onCancel,
}: LegacyMigrationFlowProps) {
  const {
    stateMachine,
    handleFirebaseAuthentication,
    handleLinkedNostrAuthentication,
    handleAccountGeneration,
    handleBringOwnKeypair,
    handleBringOwnKeypairWithCredentials,
    handleProfileCompletion,
    getStepTitle,
    getStepDescription,
    hasLinkedAccounts,
    getExpectedPubkey,
  } = useLegacyMigrationFlow();

  // Helper to convert Error to string for legacy components
  const errorToString = (error: Error | null): string | null => 
    error ? error.message : null;

  const renderCurrentStep = () => {
    switch (stateMachine.step) {
      case "firebase-auth":
        return (
          <FirebaseAuthStep
            onComplete={handleFirebaseAuthentication}
            isLoading={stateMachine.isLoading("authenticateWithFirebase")}
            error={errorToString(stateMachine.getError("authenticateWithFirebase"))}
          />
        );

      case "checking-links":
        return (
          <CheckingLinksStep
            isLoading={stateMachine.isLoading("authenticateWithFirebase")}
            error={errorToString(stateMachine.getError("authenticateWithFirebase"))}
          />
        );

      case "linked-nostr-auth":
        return (
          <LinkedNostrAuthStep
            onComplete={handleLinkedNostrAuthentication}
            isLoading={stateMachine.isLoading("authenticateWithLinkedNostr")}
            error={errorToString(stateMachine.getError("authenticateWithLinkedNostr"))}
            expectedPubkey={getExpectedPubkey()}
            linkedPubkeys={stateMachine.linkedPubkeys}
          />
        );

      case "account-choice":
        return (
          <AccountChoiceStep
            onGenerateNew={() => handleAccountGeneration()}
            onBringOwn={() => handleBringOwnKeypair()}
          />
        );

      case "account-generation":
        return (
          <AccountGenerationStep
            isLoading={stateMachine.isLoading("generateNewAccount")}
            error={errorToString(stateMachine.getError("generateNewAccount"))}
          />
        );

      case "bring-own-keypair":
        return (
          <BringKeypairStep
            onComplete={async (privateKey: string) => {
              await handleBringOwnKeypairWithCredentials({ method: "nsec", nsec: privateKey });
            }}
            isLoading={stateMachine.isLoading("bringOwnKeypair")}
            error={errorToString(stateMachine.getError("bringOwnKeypair"))}
          />
        );

      case "profile-setup":
        return (
          <ProfileSetupStep
            onComplete={handleProfileCompletion}
            isLoading={stateMachine.isLoading("completeProfile")}
            error={errorToString(stateMachine.getError("completeProfile"))}
            isArtist={true} // Legacy users are typically artists
            isSoloArtist={true} // Default to solo artist
            createdLogin={stateMachine.createdLogin}
            generatedName={stateMachine.generatedName}
          />
        );

      case "linking":
        return (
          <LoadingStep
            title="Linking Accounts"
            description="Linking your Firebase and Nostr accounts..."
          />
        );

      case "complete":
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-600">
              Migration Complete!
            </h3>
            <p className="text-muted-foreground">
              Your legacy account has been successfully migrated to the new
              system.
            </p>
            <button
              onClick={() => onComplete({ success: true })}
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

  const getCurrentStepNumber = () => {
    switch (stateMachine.step) {
      case "firebase-auth":
        return 1;
      case "checking-links":
        return 2;
      case "linked-nostr-auth":
        return 3;
      case "account-choice":
        return hasLinkedAccounts() ? 3 : 3;
      case "account-generation":
      case "bring-own-keypair":
        return 4;
      case "linking":
        return 5;
      case "complete":
        return 6;
      default:
        return 1;
    }
  };

  const getTotalSteps = () => {
    return hasLinkedAccounts() ? 4 : 6;
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
