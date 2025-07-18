import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles, LogOut, Home, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAppSetting } from "@/hooks/useAppSettings";
import { nip19 } from "nostr-tools";
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
  description?: string;
  variant?: "default" | "primary";
}
const FLOW_OPTIONS: AuthMethodOption[] = [
  {
    method: "sign-up",
    icon: Sparkles,
    title: "Get Started",
    // description: "New to Wavlake? Create your account",
    variant: "primary",
  },
  {
    method: "sign-in",
    icon: Mail,
    title: "Sign in",
    // description: "Sign in with your Nostr account",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [selectedFlow, setSelectedFlow] = useState<FlowType>(null);
  
  // All hooks must be called at the top level
  const { isAuthenticated, logout, metadata, user } = useCurrentUser();
  const isArtist = useAppSetting("isArtist");
  const npub = user?.pubkey ? nip19.npubEncode(user.pubkey) : null;

  const handleSignupComplete = (result: { isArtist: boolean }) => {
    navigate(result.isArtist ? "/dashboard" : "/groups");
  };

  const handleAuthFlowComplete = (result: {
    success: boolean;
    error?: string;
  }) => {
    if (result.success) {
      navigate("/dashboard");
    }
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
            onComplete={handleSignupComplete}
            onCancel={handleFlowCancel}
          />
        );
      case "nostr-login":
        return (
          <NostrLoginFlow
            onComplete={handleAuthFlowComplete}
            onCancel={handleFlowCancel}
          />
        );
      case "legacy-migration":
        return (
          <LegacyMigrationFlow
            onComplete={handleAuthFlowComplete}
            onCancel={handleFlowCancel}
          />
        );
      default:
        return null;
    }
  }
  
  // Check if user is already logged in
  if (isAuthenticated) {
    const displayName =
      metadata?.display_name ||
      metadata?.name ||
      npub?.slice(0, 10) + "..." + npub?.slice(-4) ||
      "Wavlake User";

    return (
      <StepWrapper
        title="Welcome Back"
        description="You're already signed in. Choose how you want to continue."
        header={StartHeader()}
      >
        <div className="flex flex-col gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Signed in as:</p>
            <p className="font-medium">{displayName}</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/groups")}
              className="w-full flex items-center gap-2"
              variant="default"
            >
              <Home className="w-4 h-4" />
              Browse Communities
            </Button>

            {isArtist && (
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-2"
                variant="outline"
              >
                <Palette className="w-4 h-4" />
                Artist Dashboard
              </Button>
            )}

            <Button
              onClick={logout}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </StepWrapper>
    );
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
