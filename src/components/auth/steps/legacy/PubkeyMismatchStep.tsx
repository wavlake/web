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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You signed in with a different Nostr account than expected. Please choose how to proceed.
        </AlertDescription>
      </Alert>

      {/* Expected vs Actual Account Display */}
      <div className="space-y-4">
        {/* Expected Account */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-amber-800">Expected Account</CardTitle>
            <CardDescription className="text-amber-700">
              The account that was previously linked to your Firebase account
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <code className="text-sm font-mono text-amber-800">
                {formatPubkey(expectedPubkey)}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Actual Account */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800">Account You Used</CardTitle>
            <CardDescription className="text-blue-700">
              The account you just authenticated with
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <code className="text-sm font-mono text-blue-800">
                {formatPubkey(actualPubkey)}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            <div className="text-sm text-amber-600">
              Sign in with the account ending in ...{expectedPubkey.slice(-8)}
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
              {isLoading ? "Linking Account..." : "Continue with New Account"}
            </div>
            <div className="text-sm text-blue-100">
              Link this account to your Firebase account
            </div>
          </div>
        </Button>
      </div>

      {/* Information Card */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">What happens when you continue?</p>
            <ul className="space-y-1 text-xs">
              <li>• Your new account will be linked to your Firebase account</li>
              <li>• You'll be able to access features that require account linking</li>
              <li>• Your previous linked account will remain accessible</li>
              <li>• You can manage linked accounts from your profile settings</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}