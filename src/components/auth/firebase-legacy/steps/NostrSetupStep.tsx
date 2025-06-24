import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { StepHeader } from "../StepHeader";
import { AuthMethodTabs } from "../AuthMethodTabs";

interface NostrSetupStepProps {
  nsec: string;
  setNsec: (nsec: string) => void;
  bunkerUri: string;
  setBunkerUri: (uri: string) => void;
  isLoading: boolean;
  onBack: () => void;
  onCreateNostrAccount: () => void;
  onExtensionLogin: () => void;
  onNsecLogin: () => void;
  onBunkerLogin: () => void;
}

export function NostrSetupStep({
  nsec,
  setNsec,
  bunkerUri,
  setBunkerUri,
  isLoading,
  onBack,
  onCreateNostrAccount,
  onExtensionLogin,
  onNsecLogin,
  onBunkerLogin,
}: NostrSetupStepProps) {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <StepHeader
        onBack={onBack}
        title="Set Up Nostr Authentication"
        description="Create a new Nostr identity or link an existing one"
      />

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Button
            onClick={onCreateNostrAccount}
            variant="default"
            className="w-full h-auto py-4 px-6"
            disabled={isLoading}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">
                  Create New Nostr Identity
                </div>
                <div className="text-xs opacity-90">
                  Recommended - We'll generate a secure key for you
                </div>
              </div>
            </div>
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              OR
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Link an existing Nostr identity
            </p>

            <AuthMethodTabs
              onExtension={onExtensionLogin}
              onNsec={onNsecLogin}
              onBunker={onBunkerLogin}
              isForAuthentication={false}
              isLoading={isLoading}
              nsec={nsec}
              setNsec={setNsec}
              bunkerUri={bunkerUri}
              setBunkerUri={setBunkerUri}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}