/**
 * Nostr Login Flow Component
 *
 * Simple flow component for direct Nostr authentication with optional legacy migration.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNostrLoginFlow } from "@/hooks/auth/flows/useNostrLoginFlow";
import { NostrAuthStep } from "../steps/shared/NostrAuthStep";
import { LegacyMigrationFlow } from "./LegacyMigrationFlow";
import { AccountSummaryStep } from "../steps/shared/AccountSummaryStep";
import { StepWrapper } from "../ui/StepWrapper";

interface AuthFlowResult {
  success: boolean;
  error?: string;
}

interface NostrLoginFlowProps {
  onComplete: (result: AuthFlowResult) => void;
  onCancel?: () => void;
}

export function NostrLoginFlow({ onComplete, onCancel }: NostrLoginFlowProps) {
  const {
    stateMachine,
    handleNostrAuthentication,
    getStepTitle,
    getStepDescription,
    getSupportedMethods,
  } = useNostrLoginFlow();

  // State for nested legacy migration flow
  const [showMigrationFlow, setShowMigrationFlow] = useState(false);

  // Handle migration flow launch
  const handleMigrationLaunch = () => {
    setShowMigrationFlow(true);
  };

  // Handle migration flow completion
  const handleMigrationComplete = (result: AuthFlowResult) => {
    console.log("Legacy migration completed:", result);
    setShowMigrationFlow(false);
    // Complete the entire flow since migration is successful
    onComplete(result);
  };

  // Handle migration flow cancellation (back to Nostr login)
  const handleMigrationCancel = () => {
    setShowMigrationFlow(false);
  };

  // If migration flow is active, render it instead
  if (showMigrationFlow) {
    return (
      <LegacyMigrationFlow
        onComplete={handleMigrationComplete}
        onCancel={handleMigrationCancel}
      />
    );
  }

  const renderCurrentStep = () => {
    switch (stateMachine.step) {
      case "auth":
        return (
          <>
            <NostrAuthStep
              onComplete={handleNostrAuthentication}
              isLoading={stateMachine.isLoading("authenticateWithNostr")}
              error={stateMachine.getError("authenticateWithNostr")}
              supportedMethods={getSupportedMethods()}
            />
            <Button
              variant="brand-purple"
              className="w-full mt-4"
              onClick={handleMigrationLaunch}
            >
              Migrate Legacy Wavlake Account
            </Button>
          </>
        );

      case "complete":
        return (
          <AccountSummaryStep
            onContinue={() => onComplete({ success: true })}
            currentPubkey={stateMachine.authenticatedPubkey || ""}
            linkedPubkeys={[]}
            isLinked={false}
            hasFirebaseBackup={false}
            flowType="login"
            isArtist={false}
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
      canGoBack={false}
      onCancel={onCancel}
      // currentStep={stateMachine.step}
      // totalSteps={1}
    >
      {renderCurrentStep()}
    </StepWrapper>
  );
}
