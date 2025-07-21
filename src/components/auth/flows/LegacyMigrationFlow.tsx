/**
 * Legacy Migration Flow Component
 *
 * Complex flow component for legacy account migration that handles
 * multiple steps and branching logic.
 */

// React import removed - not needed for this component
import { useLegacyMigrationFlow } from "@/hooks/auth/flows/useLegacyMigrationFlow";
import { FirebaseEmailStep } from "../steps/shared/FirebaseEmailStep";
import { CheckingLinksStep } from "../steps/legacy/CheckingLinksStep";
import { LinkedNostrAuthStep } from "../steps/legacy/LinkedNostrAuthStep";
import { PubkeyMismatchStep } from "../steps/legacy/PubkeyMismatchStep";
// AccountChoiceStep and AccountGenerationStep no longer used - integrated into ProfileSetupStep
// import { AccountChoiceStep } from "../steps/legacy/AccountChoiceStep";
// import { AccountGenerationStep } from "../steps/legacy/AccountGenerationStep";
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
    handlePubkeyMismatchRetry,
    handlePubkeyMismatchContinue,
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
          <FirebaseEmailStep
            variant="login"
            onComplete={handleFirebaseAuthentication}
            onContinueWithExistingUser={async () => {
              // Use empty email - the dependency will detect existing user
              await handleFirebaseAuthentication("");
            }}
            isLoading={stateMachine.isLoading("authenticateWithFirebase")}
            error={errorToString(stateMachine.getError("authenticateWithFirebase"))}
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
                Please check your email for a login link to continue.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              The link will redirect you back to this page to complete the login process.
            </p>
          </div>
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

      case "pubkey-mismatch":
        return (
          <PubkeyMismatchStep
            expectedPubkey={stateMachine.expectedPubkey || ""}
            actualPubkey={stateMachine.actualPubkey || ""}
            onRetry={handlePubkeyMismatchRetry}
            onContinue={handlePubkeyMismatchContinue}
            isLoading={stateMachine.isLoading("continueWithNewPubkey")}
            error={errorToString(stateMachine.getError("continueWithNewPubkey"))}
          />
        );

      // These steps are now skipped - users go directly to profile-setup
      // where account generation happens inline with profile creation
      case "account-choice":
      case "account-generation":
        // Should not reach these steps anymore, but fallback to profile-setup
        return (
          <ProfileSetupStep
            onComplete={handleProfileCompletion}
            isLoading={stateMachine.isLoading("completeProfile")}
            error={errorToString(stateMachine.getError("completeProfile"))}
            isArtist={true}
            isSoloArtist={true}
            createdLogin={stateMachine.createdLogin}
            generatedName={stateMachine.generatedName}
            onGenerateAccount={handleAccountGeneration}
            onSignInWithExisting={handleBringOwnKeypairWithCredentials}
            isGenerating={stateMachine.isLoading("generateNewAccount")}
            generateError={errorToString(stateMachine.getError("generateNewAccount"))}
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
            // Account generation props for users without createdLogin
            onGenerateAccount={stateMachine.createdLogin ? undefined : handleAccountGeneration}
            onSignInWithExisting={stateMachine.createdLogin ? undefined : handleBringOwnKeypairWithCredentials}
            isGenerating={stateMachine.isLoading("generateNewAccount")}
            generateError={errorToString(stateMachine.getError("generateNewAccount"))}
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
            displayName={stateMachine.profileData?.name || stateMachine.profileData?.display_name || stateMachine.generatedName || undefined}
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
