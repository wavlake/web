/**
 * Legacy Migration Flow Component
 *
 * Complex flow component for legacy account migration that handles
 * multiple steps and branching logic.
 */

// React import removed - not needed for this component
import { useLegacyMigrationFlow } from "@/hooks/auth/flows/useLegacyMigrationFlow";
import { FirebaseAuthStep } from "../steps/legacy/FirebaseAuthStep";
import { CheckingLinksStep } from "../steps/legacy/CheckingLinksStep";
import { LinkedNostrAuthStep } from "../steps/legacy/LinkedNostrAuthStep";
import { AccountChoiceStep } from "../steps/legacy/AccountChoiceStep";
import { AccountGenerationStep } from "../steps/legacy/AccountGenerationStep";
import { BringKeypairStep } from "../steps/legacy/BringKeypairStep";
import { ProfileSetupStep } from "../steps/signup/ProfileSetupStep";
import { LoadingStep } from "../steps/shared/LoadingStep";
import { AccountSummaryStep } from "../steps/shared/AccountSummaryStep";
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
            onContinueWithExistingUser={async () => {
              // Use empty credentials - the dependency will detect existing user
              await handleFirebaseAuthentication("", "");
            }}
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
        // This step should no longer be reached due to atomic linking
        return (
          <LoadingStep
            title="Linking Accounts"
            description="Linking your Firebase and Nostr accounts..."
          />
        );

      case "complete":
        return (
          <AccountSummaryStep
            onContinue={() => onComplete({ success: true })}
            currentPubkey={stateMachine.generatedAccount?.pubkey || stateMachine.createdLogin?.pubkey || ""}
            displayName={stateMachine.generatedName || stateMachine.profileData?.display_name}
            linkedPubkeys={stateMachine.linkedPubkeys}
            isLinked={true}
            firebaseEmail={stateMachine.firebaseUser?.email || undefined}
            hasFirebaseBackup={!!stateMachine.firebaseUser}
            flowType="migration"
            isArtist={true}
          />
        );

      default:
        return null;
    }
  };

  // Step counting functions removed since step indicators are commented out in StepWrapper

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
