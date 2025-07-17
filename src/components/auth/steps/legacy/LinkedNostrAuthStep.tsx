/**
 * Linked Nostr Auth Step
 * 
 * Handles authentication when the user has linked Nostr accounts.
 * Shows the expected account and provides Nostr auth options.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, CheckCircle, AlertCircle } from "lucide-react";
import { LinkedPubkey } from "@/hooks/auth/machines/types";

// Import extracted components and utilities
import { NostrAuthTabs } from "../../ui/NostrAuthTabs";
import { NostrAuthErrorDisplay } from "../../ui/NostrAuthErrorDisplay";
import { AuthLoadingStates, AuthErrors } from "../../types";
import { formatPubkey, formatTimeAgo } from "../../utils/formatters";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Helper Functions (now using extracted utilities)
// ============================================================================

// Helper functions are now imported from extracted utilities:
// - formatPubkey() from formatters.ts
// - formatTimeAgo() from formatters.ts

// ============================================================================
// Component
// ============================================================================

export function LinkedNostrAuthStep({
  expectedPubkey,
  linkedPubkeys,
  onComplete,
  isLoading,
  error,
  onBack,
  onUseDifferentAccount,
}: LinkedNostrAuthStepProps) {
  // ============================================================================
  // State (using extracted types)
  // ============================================================================

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

  // Find the expected account info
  const expectedAccount = expectedPubkey ? linkedPubkeys.find(p => p.pubkey === expectedPubkey) : null;

  // ============================================================================
  // Event Handlers (for NostrAuthTabs)
  // ============================================================================

  const handleExtensionAuth = async () => {
    setLoadingStates((prev) => ({ ...prev, extension: true }));
    setErrors((prev) => ({ ...prev, extension: null }));
    try {
      await onComplete({ method: "extension" });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        extension: error instanceof Error ? error : new Error("Extension authentication failed"),
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
        nsec: error instanceof Error ? error : new Error("Nsec authentication failed"),
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
        bunker: error instanceof Error ? error : new Error("Bunker authentication failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, bunker: false }));
    }
  };

  // ============================================================================
  // Render Tabbed Authentication (now using extracted NostrAuthTabs)
  // ============================================================================

  // Authentication tabs are now handled by the extracted NostrAuthTabs component

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Linked Account Found
        </CardTitle>
        <CardDescription>
          We found a Nostr account linked to your Wavlake account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        <NostrAuthErrorDisplay error={error ? new Error(error) : null} />
        
        {/* Expected Account Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Expected Account:</span>
            {expectedAccount?.isMostRecentlyLinked && (
              <Badge variant="secondary">Most Recent</Badge>
            )}
          </div>
          
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <code className="text-sm">{expectedPubkey ? formatPubkey(expectedPubkey) : 'Unknown'}</code>
            </div>
            {expectedAccount?.linkedAt && (
              <div className="text-xs text-muted-foreground">
                Linked {formatTimeAgo(expectedAccount.linkedAt)}
              </div>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Tabbed Authentication Interface */}
        <NostrAuthTabs
          onExtensionAuth={handleExtensionAuth}
          onNsecAuth={handleNsecAuth}
          onBunkerAuth={handleBunkerAuth}
          loadingStates={loadingStates}
          errors={errors}
          externalLoading={isLoading}
          expectedPubkey={expectedPubkey || undefined}
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
        
        {/* Help Text */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            You need to authenticate with the specific Nostr account that's linked to your Wavlake account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}