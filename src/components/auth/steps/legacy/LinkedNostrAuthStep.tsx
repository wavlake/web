/**
 * Linked Nostr Auth Step
 *
 * Handles authentication when the user has linked Nostr accounts.
 * Shows the expected account and provides Nostr auth options.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, CheckCircle, AlertCircle } from "lucide-react";
import { LinkedPubkey } from "@/hooks/auth/machines/types";

// Import extracted components and utilities
import { NostrAuthTabs } from "../../ui/NostrAuthTabs";
import { NostrAuthErrorDisplay } from "../../ui/NostrAuthErrorDisplay";
import { AuthLoadingStates, AuthErrors } from "../../types";
import { formatPubkey, formatTimeAgo } from "../../utils/formatters";

interface LinkedNostrAuthStepProps {
  expectedPubkey: string | null;
  linkedPubkeys: LinkedPubkey[];
  onComplete: (credentials: NostrCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onBack?: () => void;
  onUseDifferentAccount?: () => void;
}

type NostrAuthMethod = "extension" | "nsec" | "bunker";

interface NostrCredentials {
  method: NostrAuthMethod;
  nsec?: string;
  bunkerUri?: string;
}

export function LinkedNostrAuthStep({
  expectedPubkey,
  linkedPubkeys,
  onComplete,
  isLoading,
  error,
  onBack,
  onUseDifferentAccount,
}: LinkedNostrAuthStepProps) {
  const [loadingStates, setLoadingStates] = useState<AuthLoadingStates>({
    extension: false,
    nsec: false,
    bunker: false,
  });
  const [errors, setErrors] = useState<AuthErrors>({
    extension: null,
    nsec: null,
    bunker: null,
  });

  // Use the first account as the expected account
  const expectedAccount = linkedPubkeys.length > 0 ? linkedPubkeys[0] : null;

  const handleExtensionAuth = async () => {
    setLoadingStates((prev) => ({ ...prev, extension: true }));
    setErrors((prev) => ({ ...prev, extension: null }));
    try {
      await onComplete({ method: "extension" });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        extension:
          error instanceof Error
            ? error
            : new Error("Extension authentication failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, extension: false }));
    }
  };

  const handleNsecAuth = async (nsecValue: string) => {
    setLoadingStates((prev) => ({ ...prev, nsec: true }));
    setErrors((prev) => ({ ...prev, nsec: null }));
    try {
      await onComplete({ method: "nsec", nsec: nsecValue });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        nsec:
          error instanceof Error
            ? error
            : new Error("Nsec authentication failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, nsec: false }));
    }
  };

  const handleBunkerAuth = async (bunkerUri: string) => {
    setLoadingStates((prev) => ({ ...prev, bunker: true }));
    setErrors((prev) => ({ ...prev, bunker: null }));
    try {
      await onComplete({ method: "bunker", bunkerUri });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        bunker:
          error instanceof Error
            ? error
            : new Error("Bunker authentication failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, bunker: false }));
    }
  };
  const [lastLinkedPubkey] = linkedPubkeys;
  return (
    <div>
      {/* Error Display */}
      <NostrAuthErrorDisplay error={error ? new Error(error) : null} />

      {lastLinkedPubkey && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Linked Account:</span>
          </div>
          <div
            key={lastLinkedPubkey.pubkey}
            className="rounded-lg p-3 space-y-2 bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm">
                  {formatPubkey(lastLinkedPubkey.pubkey)}
                </code>
              </div>
            </div>
            {lastLinkedPubkey.linkedAt && (
              <div className="text-xs text-muted-foreground">
                Linked {formatTimeAgo(lastLinkedPubkey.linkedAt)}
              </div>
            )}
            {lastLinkedPubkey.profile && (
              <div className="text-xs text-muted-foreground">
                {lastLinkedPubkey.profile.display_name ||
                  lastLinkedPubkey.profile.name ||
                  "No profile name"}
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Tabbed Authentication Interface */}
      <NostrAuthTabs
        onExtensionAuth={handleExtensionAuth}
        onNsecAuth={handleNsecAuth}
        onBunkerAuth={handleBunkerAuth}
        loadingStates={loadingStates}
        errors={errors}
        externalLoading={isLoading}
        expectedPubkey={expectedAccount?.pubkey || undefined}
      />

      {/* Navigation Buttons */}
      <div className="space-y-2">
        {onUseDifferentAccount && (
          <Button
            variant="outline"
            onClick={onUseDifferentAccount}
            className="w-full"
            disabled={isLoading}
          >
            Use Different Account
          </Button>
        )}

        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
            disabled={isLoading}
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
