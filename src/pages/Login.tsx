import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import the new flow components
import { SignupFlow } from "@/components/auth/flows/SignupFlow";
import { NostrLoginFlow } from "@/components/auth/flows/NostrLoginFlow";
import { LegacyMigrationFlow } from "@/components/auth/flows/LegacyMigrationFlow";
import { StepWrapper } from "@/components/auth/ui/StepWrapper";

type FlowType = "signup" | "nostr-login" | "legacy-migration" | null;

interface AuthMethodOption {
  method: "sign-in" | "sign-up";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  variant?: "default" | "primary";
}
const FLOW_OPTIONS: AuthMethodOption[] = [
  {
    method: "sign-up",
    icon: Sparkles,
    title: "Get Started",
    description: "New to Wavlake? Create your account",
    variant: "primary",
  },
  {
    method: "sign-in",
    icon: Mail,
    title: "Sign in",
    description: "Sign in with your Nostr account",
  },
];

export default function AuthTest() {
  const navigate = useNavigate();
  const [selectedFlow, setSelectedFlow] = useState<FlowType>(null);
  const [completedFlows, setCompletedFlows] = useState<Set<FlowType>>(
    new Set()
  );

  const handleFlowComplete = (flowType: FlowType, result: unknown) => {
    console.log(`${flowType} completed:`, result);
    setCompletedFlows((prev) => new Set([...prev, flowType]));
    setSelectedFlow(null);

    // In a real app, this would navigate to the dashboard
    alert(`${flowType} completed successfully! Check console for details.`);
  };

  const handleFlowCancel = () => {
    setSelectedFlow(null);
  };

  // Render the selected flow
  if (selectedFlow) {
    switch (selectedFlow) {
      case "signup":
        return (
          <SignupFlow
            onComplete={(result) => handleFlowComplete("signup", result)}
            onCancel={handleFlowCancel}
          />
        );
      case "nostr-login":
        return (
          <NostrLoginFlow
            onComplete={(result) => handleFlowComplete("nostr-login", result)}
            onCancel={handleFlowCancel}
          />
        );
      case "legacy-migration":
        return (
          <LegacyMigrationFlow
            onComplete={(result) =>
              handleFlowComplete("legacy-migration", result)
            }
            onCancel={handleFlowCancel}
          />
        );
      default:
        return null;
    }
  }

  // Render flow selection screen
  return (
    <StepWrapper
      title="Welcome to Wavlake"
      description="Choose how you want to get started"
      header={StartHeader()}
    >
      {FLOW_OPTIONS.map((method) => {
        const IconComponent = method.icon;

        return (
          <Button
            key={method.method}
            onClick={() => {
              if (method.method === "sign-up") {
                setSelectedFlow("signup");
              } else if (method.method === "sign-in") {
                setSelectedFlow("nostr-login");
              }
            }}
            variant={method.variant === "primary" ? "default" : "outline"}
            className={`w-full h-auto min-h-[100px] sm:min-h-[80px] py-4 sm:py-4 px-4 sm:px-4 rounded-xl text-left border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              method.variant === "primary"
                ? "hover:bg-primary/90 active:bg-primary/80"
                : "hover:bg-muted/50 active:bg-muted/70"
            }`}
            size="lg"
          >
            <div className="flex items-center gap-3 w-full">
              <IconComponent
                className={`w-5 h-5 shrink-0 ${
                  method.variant === "primary"
                    ? "text-primary-foreground"
                    : "text-primary"
                }`}
              />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="font-medium text-base sm:text-base">
                  {method.title}
                </div>
                <div className="text-sm sm:text-sm text-muted-foreground mt-1 leading-tight break-words whitespace-normal">
                  {method.description}
                </div>
              </div>
            </div>
          </Button>
        );
      })}
    </StepWrapper>
  );
}

const StartHeader = () => {
  return (
    <div className="w-full sm:max-w-md mx-auto text-center mb-6 sm:mb-8 px-4 sm:px-0">
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <img
          src="/wavlake-icon-96.png"
          alt="Wavlake"
          width={48}
          height={48}
          className="object-contain sm:w-16 sm:h-16"
        />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Wavlake</h1>
      </div>
      <p className="text-base sm:text-lg text-muted-foreground">
        Stream Anywhere, Earn Everywhere
      </p>
    </div>
  );
};
