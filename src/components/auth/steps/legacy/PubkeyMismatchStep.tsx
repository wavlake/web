/**
 * Pubkey Mismatch Step
 *
 * Handles the case where a user authenticates with a different pubkey
 * than the expected linked pubkey. Provides options to retry or continue
 * with the new pubkey (which will be linked to their Firebase account).
 */

import { AlertTriangle, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PubkeyMismatchAlert } from "../../PubkeyMismatchAlert";
import { hexToNpub } from "../../utils/formatters";

interface PubkeyMismatchStepProps {
  expectedPubkey: string;
  actualPubkey: string;
  onRetry: () => void;
  onContinue: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Helper function to format pubkey for display
const formatPubkey = (pubkey: string): string => {
  if (!pubkey) return "";
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
};

export function PubkeyMismatchStep({
  expectedPubkey,
  actualPubkey,
  onRetry,
  onContinue,
  isLoading,
  error,
}: PubkeyMismatchStepProps) {
  const npub = expectedPubkey ? hexToNpub(expectedPubkey) : "";
  return (
    <div className="space-y-6">
      <PubkeyMismatchAlert
        expectedPubkey={expectedPubkey}
        enteredPubkey={actualPubkey}
      />

      {/* Action Options */}
      <div className="space-y-3">
        {/* Retry Button */}
        <Button
          onClick={onRetry}
          variant="outline"
          className="w-full h-auto min-h-[60px] py-4 px-4 rounded-xl border-amber-200 hover:border-amber-300 hover:bg-amber-50"
          disabled={isLoading}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-base font-medium text-amber-800">
              Try Again with Expected Account
            </div>
          </div>
        </Button>

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          className="w-full h-auto min-h-[60px] py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-base font-medium text-white">
              {isLoading ? "Linking Account..." : "Continue with this Account"}
            </div>
            <div className="text-sm text-blue-100">
              Link this account to your Firebase account
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
