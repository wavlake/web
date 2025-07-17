/**
 * Nostr Authentication Error Display Component
 * 
 * Provides consistent error display for authentication components
 * with support for different error types and styling variants.
 * 
 * This component extracts the common error display patterns
 * used across authentication components.
 */

import React from "react";
import { AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NostrAvatar } from "@/components/NostrAvatar";

// Import shared types and utilities
import { AuthErrorDisplayProps } from "../types";
import { formatErrorMessage, formatPubkey } from "../utils/formatters";

// ============================================================================
// Error Display Variants
// ============================================================================

interface PubkeyMismatchError {
  type: "pubkey-mismatch";
  expectedPubkey: string;
  actualPubkey: string;
}

interface MethodError {
  type: "method-error";
  method: string;
  message: string;
}

interface GeneralError {
  type: "general";
  message: string;
}

type ErrorData = PubkeyMismatchError | MethodError | GeneralError;

// ============================================================================
// Props Interface
// ============================================================================

interface NostrAuthErrorDisplayProps extends AuthErrorDisplayProps {
  errorData?: ErrorData;
}

// ============================================================================
// Component
// ============================================================================

/**
 * NostrAuthErrorDisplay Component
 * 
 * Displays authentication errors with appropriate styling and context.
 * Supports different error types including pubkey mismatches, method-specific
 * errors, and general authentication failures.
 * 
 * @example
 * ```tsx
 * // General error display
 * <NostrAuthErrorDisplay error="Authentication failed" />
 * 
 * // Pubkey mismatch error
 * <NostrAuthErrorDisplay 
 *   errorData={{
 *     type: "pubkey-mismatch",
 *     expectedPubkey: "abc123...",
 *     actualPubkey: "def456..."
 *   }}
 * />
 * 
 * // Method-specific error
 * <NostrAuthErrorDisplay 
 *   errorData={{
 *     type: "method-error",
 *     method: "extension",
 *     message: "Extension not found"
 *   }}
 * />
 * ```
 */
export function NostrAuthErrorDisplay({
  error,
  errorData,
  variant = "destructive",
  className = "",
}: NostrAuthErrorDisplayProps) {
  // ============================================================================
  // Early Return if No Error
  // ============================================================================

  if (!error && !errorData) {
    return null;
  }

  // ============================================================================
  // Error Content Rendering
  // ============================================================================

  const renderPubkeyMismatchError = (data: PubkeyMismatchError) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-600" />
        <span className="font-medium">Account Mismatch</span>
      </div>
      
      <div className="text-sm">
        The account you authenticated with does not match the expected account for this action.
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Expected:</span>
          <NostrAvatar pubkey={data.expectedPubkey} size={16} />
          <code className="font-mono">
            {formatPubkey(data.expectedPubkey, 8, 8)}
          </code>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Got:</span>
          <NostrAvatar pubkey={data.actualPubkey} size={16} />
          <code className="font-mono">
            {formatPubkey(data.actualPubkey, 8, 8)}
          </code>
        </div>
      </div>
    </div>
  );

  const renderMethodError = (data: MethodError) => (
    <div className="space-y-2">
      <div className="font-medium">
        {data.method.charAt(0).toUpperCase() + data.method.slice(1)} Authentication Failed
      </div>
      <div className="text-sm">
        {formatErrorMessage(data.message)}
      </div>
    </div>
  );

  const renderGeneralError = (data: GeneralError) => (
    <div className="text-sm">
      {formatErrorMessage(data.message)}
    </div>
  );

  // ============================================================================
  // Main Error Content
  // ============================================================================

  const renderErrorContent = () => {
    if (errorData) {
      switch (errorData.type) {
        case "pubkey-mismatch":
          return renderPubkeyMismatchError(errorData);
        case "method-error":
          return renderMethodError(errorData);
        case "general":
          return renderGeneralError(errorData);
        default:
          return <div className="text-sm">{formatErrorMessage(errorData)}</div>;
      }
    }

    // Fallback to simple error message
    return <div className="text-sm">{formatErrorMessage(error)}</div>;
  };

  // ============================================================================
  // Alert Variant Logic
  // ============================================================================

  const getAlertVariant = () => {
    if (errorData?.type === "pubkey-mismatch") {
      return "default"; // Use default variant for warnings
    }
    return variant;
  };

  const getAlertClassName = () => {
    const baseClasses = className;
    
    if (errorData?.type === "pubkey-mismatch") {
      return `${baseClasses} border-amber-200 bg-amber-50`;
    }
    
    return baseClasses;
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Alert variant={getAlertVariant()} className={getAlertClassName()}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {renderErrorContent()}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Helper Functions for Common Error Scenarios
// ============================================================================

/**
 * Creates a pubkey mismatch error data object
 */
export function createPubkeyMismatchError(
  expectedPubkey: string, 
  actualPubkey: string
): PubkeyMismatchError {
  return {
    type: "pubkey-mismatch",
    expectedPubkey,
    actualPubkey,
  };
}

/**
 * Creates a method-specific error data object
 */
export function createMethodError(
  method: string, 
  message: string
): MethodError {
  return {
    type: "method-error",
    method,
    message,
  };
}

/**
 * Creates a general error data object
 */
export function createGeneralError(message: string): GeneralError {
  return {
    type: "general",
    message,
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type { 
  NostrAuthErrorDisplayProps,
  PubkeyMismatchError,
  MethodError,
  GeneralError,
  ErrorData 
};

// ============================================================================
// Display Name
// ============================================================================

NostrAuthErrorDisplay.displayName = "NostrAuthErrorDisplay";