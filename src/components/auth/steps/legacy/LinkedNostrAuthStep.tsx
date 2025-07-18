/**
 * Linked Nostr Auth Step
 *
 * Handles authentication when the user has linked Nostr accounts.
 * Shows the expected account and provides Nostr auth options.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkedPubkey } from "@/hooks/auth/machines/types";

// Import extracted components and utilities
import { NostrAuthTabs } from "../../ui/NostrAuthTabs";
import { NostrAuthErrorDisplay } from "../../ui/NostrAuthErrorDisplay";
import { AuthLoadingStates, AuthErrors } from "../../types";
import { formatTimeAgo } from "../../utils/formatters";
import { NostrAvatar } from "@/components/NostrAvatar";

interface LinkedNostrAuthStepProps {
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

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Error Display - Compact */}
      <NostrAuthErrorDisplay error={error ? new Error(error) : null} />

      {/* Linked Account - Improved Display */}
      {expectedAccount && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Linked Account:</span>
            {expectedAccount.linkedAt && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                Linked {formatTimeAgo(expectedAccount.linkedAt)}
              </div>
            )}
          </div>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <NostrAvatar 
              includeName 
              layout="horizontal"
              size={48}
              pubkey={expectedAccount.pubkey} 
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Main Content - Flexible */}
      <div className="flex-1 flex flex-col">
        {/* Tabbed Authentication Interface */}
        <div className="flex-1">
          <NostrAuthTabs
            onExtensionAuth={handleExtensionAuth}
            onNsecAuth={handleNsecAuth}
            onBunkerAuth={handleBunkerAuth}
            loadingStates={loadingStates}
            errors={errors}
            externalLoading={isLoading}
          />
        </div>

        {/* Navigation Buttons - Sticky Bottom */}
        <div className="mt-6 space-y-3">
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
    </div>
  );
}
