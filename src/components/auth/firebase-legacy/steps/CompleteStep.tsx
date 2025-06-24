import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MigrationStep } from "../types";

interface CompleteStepProps {
  migrationState: MigrationStep;
  onComplete: () => void;
}

export function CompleteStep({ migrationState, onComplete }: CompleteStepProps) {
  const { selectedPubkey } = migrationState.data || {};

  return (
    <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
      <CardHeader className="text-center">
        <CardTitle className="text-green-800">
          Successfully Authenticated! 🎉
        </CardTitle>
        <CardDescription className="text-green-600">
          You've successfully signed in with your Nostr identity.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-green-700">
          <p>✅ Access to all publishing features</p>
          <p>✅ Enhanced security with Nostr signatures</p>
          <p>✅ Email recovery still available</p>
          <p>✅ All your existing data preserved</p>
        </div>

        {selectedPubkey && (
          <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="text-sm text-blue-800">
              <strong>Connected pubkey:</strong>{" "}
              <span className="font-mono">
                {selectedPubkey.slice(0, 8)}...{selectedPubkey.slice(-8)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardContent>
        <Button onClick={onComplete} className="w-full">
          Continue to App
        </Button>
      </CardContent>
    </Card>
  );
}