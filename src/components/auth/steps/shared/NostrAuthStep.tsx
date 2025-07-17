import React, { useState } from "react";
import { Shield } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfileSync } from "@/hooks/useProfileSync";
import { NostrAvatar } from "@/components/NostrAvatar";
import { nip19 } from "nostr-tools";

// Import extracted components
import { NostrAuthTabs } from "../../ui/NostrAuthTabs";
import { NostrAuthErrorDisplay, createPubkeyMismatchError } from "../../ui/NostrAuthErrorDisplay";
import { AuthLoadingStates, AuthErrors, NostrAuthMethod, NostrCredentials } from "../../types";
import { validatePubkeyMatch } from "../../utils/validation";
import { formatPubkey } from "../../utils/formatters";

// ============================================================================
// Types
// ============================================================================

export interface NostrAuthStepProps {
  // Step content
  title?: string;
  description?: string;

  // Expected pubkey for validation (optional)
  expectedPubkey?: string;

  // Supported auth methods
  supportedMethods?: NostrAuthMethod[];

  // Event handlers
  onComplete?: (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<void> | void;
  onError?: (error: Error) => void;

  // Loading and error states
  isLoading?: boolean;
  error?: Error | null;

  // UI state
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Nostr Authentication Step
 *
 * A complete authentication component that handles all three Nostr authentication
 * methods (extension, nsec, bunker) with proper error handling and validation.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NostrAuthStep onComplete={handleComplete} />
 *
 * // With custom title and description
 * <NostrAuthStep
 *   title="Sign in to your account"
 *   description="Use your Nostr keys to authenticate"
 *   onComplete={handleComplete}
 *   onError={handleError}
 * />
 *
 * // With expected pubkey validation
 * <NostrAuthStep
 *   expectedPubkey="npub1abc..."
 *   onComplete={handleComplete}
 * />
 * ```
 */
export function NostrAuthStep({
  title = "Sign in with Nostr",
  description = "Choose your preferred authentication method",
  expectedPubkey,
  onComplete,
  onError,
  className = "",
  isLoading: externalLoading = false,
  error: externalError = null,
}: NostrAuthStepProps) {
  // ============================================================================
  // State
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
  const [mismatchWarning, setMismatchWarning] = useState<{
    expectedPubkey: string;
    enteredPubkey: string;
  } | null>(null);

  // ============================================================================
  // Hooks
  // ============================================================================

  const { loginWithExtension, loginWithNsec, loginWithBunker } = useCurrentUser();
  const { syncProfile } = useProfileSync();

  // ============================================================================
  // Utility Functions
  // ============================================================================

  // Function to validate pubkey match using extracted utility
  const checkPubkeyMatch = (enteredPubkey: string): boolean => {
    if (!expectedPubkey) return true;

    const validation = validatePubkeyMatch(expectedPubkey, enteredPubkey);
    
    if (!validation.isValid) {
      // Normalize pubkeys to hex format for mismatch display
      let expectedPubkeyHex = expectedPubkey;
      if (expectedPubkey.startsWith("npub1")) {
        try {
          const decoded = nip19.decode(expectedPubkey);
          expectedPubkeyHex = decoded.data as string;
        } catch (error) {
          console.error("Error decoding expected pubkey:", error);
          return false;
        }
      }

      setMismatchWarning({
        expectedPubkey: expectedPubkeyHex,
        enteredPubkey: enteredPubkey,
      });
      return false;
    } else {
      setMismatchWarning(null);
    }
    return true;
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleComplete = async (method: NostrAuthMethod, credentials: NostrCredentials) => {
    try {
      if (onComplete) {
        await onComplete(method, credentials);
      }
    } catch (error) {
      console.error("NostrAuthStep completion failed:", error);
      if (onError) {
        onError(
          error instanceof Error
            ? error
            : new Error("Authentication completion failed")
        );
      }
    }
  };

  const handleExtensionAuth = async () => {
    setLoadingStates((prev) => ({ ...prev, extension: true }));
    setErrors((prev) => ({ ...prev, extension: null }));
    try {
      if (!("nostr" in window)) {
        throw new Error(
          "Nostr extension not found. Please install a NIP-07 extension."
        );
      }
      const loginInfo = await loginWithExtension();

      // Validate pubkey match if expected pubkey is provided
      if (expectedPubkey && !checkPubkeyMatch(loginInfo.pubkey)) {
        throw new Error(
          "The connected account does not match the expected pubkey"
        );
      }

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      await handleComplete("extension", { method: "extension" });
    } catch (error) {
      console.error("Extension login failed:", error);
      setErrors((prev) => ({
        ...prev,
        extension:
          error instanceof Error ? error : new Error("Extension login failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, extension: false }));
    }
  };

  const handleNsecAuth = async (nsecValue: string) => {
    setLoadingStates((prev) => ({ ...prev, nsec: true }));
    setErrors((prev) => ({ ...prev, nsec: null }));

    try {
      const loginInfo = loginWithNsec(nsecValue);

      // Validate pubkey match if expected pubkey is provided
      if (expectedPubkey && !checkPubkeyMatch(loginInfo.pubkey)) {
        throw new Error(
          "The entered nsec does not match the expected pubkey"
        );
      }

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      await handleComplete("nsec", { method: "nsec", nsec: nsecValue });
    } catch (error) {
      console.error("Nsec login failed:", error);
      setErrors((prev) => ({
        ...prev,
        nsec: error instanceof Error ? error : new Error("Nsec login failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, nsec: false }));
    }
  };

  const handleBunkerAuth = async (bunkerUri: string) => {
    setLoadingStates((prev) => ({ ...prev, bunker: true }));
    setErrors((prev) => ({ ...prev, bunker: null }));

    try {
      const loginInfo = await loginWithBunker(bunkerUri);

      // Validate pubkey match if expected pubkey is provided
      if (expectedPubkey && !checkPubkeyMatch(loginInfo.pubkey)) {
        throw new Error(
          "The bunker account does not match the expected pubkey"
        );
      }

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      await handleComplete("bunker", { method: "bunker", bunkerUri });
    } catch (error) {
      console.error("Bunker login failed:", error);
      setErrors((prev) => ({
        ...prev,
        bunker: error instanceof Error ? error : new Error("Bunker login failed"),
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, bunker: false }));
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={className}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* External Error Display */}
      <NostrAuthErrorDisplay error={externalError} className="mb-4" />

      {/* Expected Pubkey Display */}
      {expectedPubkey && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Expected Account
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NostrAvatar pubkey={expectedPubkey} size={24} />
            <span className="text-xs font-mono text-amber-700">
              {formatPubkey(expectedPubkey, 8, 8)}
            </span>
          </div>
        </div>
      )}

      {/* Pubkey Mismatch Warning */}
      {mismatchWarning && (
        <NostrAuthErrorDisplay
          error={null}
          errorData={createPubkeyMismatchError(
            mismatchWarning.expectedPubkey,
            mismatchWarning.enteredPubkey
          )}
          className="mb-4"
        />
      )}

      {/* Authentication Tabs */}
      <NostrAuthTabs
        onExtensionAuth={handleExtensionAuth}
        onNsecAuth={handleNsecAuth}
        onBunkerAuth={handleBunkerAuth}
        loadingStates={loadingStates}
        errors={errors}
        externalLoading={externalLoading}
        expectedPubkey={expectedPubkey}
      />
    </div>
  );
}

// ============================================================================
// Default Props
// ============================================================================

NostrAuthStep.defaultProps = {
  title: "Sign in with Nostr",
  description: "Choose your preferred authentication method",
} as Partial<NostrAuthStepProps>;

// ============================================================================
// Display Name
// ============================================================================

NostrAuthStep.displayName = "NostrAuthStep";