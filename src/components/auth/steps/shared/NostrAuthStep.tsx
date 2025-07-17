/**
 * Nostr Authentication Step Component
 *
 * This component is a wrapper around the existing NostrAuthForm component,
 * integrating it with the new flow pattern. It provides a consistent interface
 * for all flows that need Nostr authentication.
 */

import { NostrAuthForm } from "@/components/auth/NostrAuthForm";

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
  supportedMethods?: string[];

  // Event handlers
  onComplete?: () => Promise<void> | void;
  onError?: (error: string) => void;

  // Loading and error states
  isLoading?: boolean;
  error?: string | null;

  // UI state
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Nostr Authentication Step
 *
 * A wrapper around NostrAuthForm that integrates with the new flow pattern.
 * This component provides a consistent interface for authentication across
 * all flows while preserving the existing NostrAuthForm functionality.
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
}: NostrAuthStepProps) {
  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle successful authentication from NostrAuthForm
   */
  const handleComplete = async () => {
    try {
      if (onComplete) {
        await onComplete();
      }
    } catch (error) {
      console.error("NostrAuthStep completion failed:", error);
      if (onError) {
        onError(
          error instanceof Error
            ? error.message
            : "Authentication completion failed"
        );
      }
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <NostrAuthForm
      title={title}
      description={description}
      expectedPubkey={expectedPubkey}
      onComplete={handleComplete}
    />
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
