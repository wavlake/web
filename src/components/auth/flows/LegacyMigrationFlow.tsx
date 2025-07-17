/**
 * Legacy Migration Flow Component
 *
 * Complex flow component for legacy account migration that handles
 * multiple steps and branching logic.
 */

import { useLegacyMigrationFlow } from "@/hooks/auth/flows/useLegacyMigrationFlow";
import { FirebaseAuthStep } from "../steps/legacy/FirebaseAuthStep";
import { CheckingLinksStep } from "../steps/legacy/CheckingLinksStep";
import { LinkedNostrAuthStep } from "../steps/legacy/LinkedNostrAuthStep";
import { AccountChoiceStep } from "../steps/legacy/AccountChoiceStep";
import { AccountGenerationStep } from "../steps/legacy/AccountGenerationStep";
import { BringKeypairStep } from "../steps/legacy/BringKeypairStep";
import { LoadingStep } from "../steps/shared/LoadingStep";
import { StepWrapper } from "../ui/StepWrapper";

interface FlowCompletionResult {
  success: boolean;
  message?: string;
}
interface LegacyMigrationFlowProps {
  onComplete: (result: FlowCompletionResult) => void;
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
    getStepTitle,
    getStepDescription,
    getExpectedPubkey,
  } = useLegacyMigrationFlow();

  // Wrapper to convert private key to NostrCredentials for BringKeypairStep
  const handleBringOwnKeypairWithPrivateKey = async (privateKey: string) => {
    const credentials = {
      method: "nsec" as const,
      nsec: privateKey,
    };
    return handleBringOwnKeypairWithCredentials(credentials);
  };

  const renderCurrentStep = () => {
    switch (stateMachine.step) {
      case "firebase-auth":
        return (
          <FirebaseAuthStep
            onComplete={handleFirebaseAuthentication}
            isLoading={stateMachine.isLoading("authenticateWithFirebase")}
            error={stateMachine.getError("authenticateWithFirebase")}
          />
        );

      case "checking-links":
        return (
          <CheckingLinksStep
            isLoading={stateMachine.isLoading("authenticateWithFirebase")}
            error={stateMachine.getError("authenticateWithFirebase")}
          />
        );

      case "linked-nostr-auth":
        return (
          <LinkedNostrAuthStep
            onComplete={handleLinkedNostrAuthentication}
            isLoading={stateMachine.isLoading("authenticateWithLinkedNostr")}
            error={stateMachine.getError("authenticateWithLinkedNostr")}
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
            error={stateMachine.getError("generateNewAccount")}
          />
        );

      case "bring-own-keypair":
        return (
          <BringKeypairStep
            onComplete={handleBringOwnKeypairWithPrivateKey}
            isLoading={stateMachine.isLoading("bringOwnKeypair")}
            error={stateMachine.getError("bringOwnKeypair")}
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
