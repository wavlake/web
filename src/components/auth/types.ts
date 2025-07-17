/**
 * Shared Types for Authentication Components
 * 
 * Common types and interfaces used across authentication components
 * to ensure consistency and reduce duplication.
 */

// ============================================================================
// Authentication Method Types
// ============================================================================

export type NostrAuthMethod = "extension" | "nsec" | "bunker";

export interface NostrCredentials {
  method: NostrAuthMethod;
  nsec?: string;
  bunkerUri?: string;
}

// ============================================================================
// Authentication State Types
// ============================================================================

export interface AuthLoadingStates {
  extension: boolean;
  nsec: boolean;
  bunker: boolean;
}

export interface AuthErrors {
  extension: Error | null;
  nsec: Error | null;
  bunker: Error | null;
}

// ============================================================================
// Authentication Handler Types
// ============================================================================

export type AuthCompletionHandler = (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<void> | void;
export type AuthErrorHandler = (error: Error) => void;

// ============================================================================
// Authentication Props Types
// ============================================================================

export interface BaseAuthProps {
  // Loading and error states
  isLoading?: boolean;
  error?: Error | null;
  
  // Event handlers
  onComplete?: AuthCompletionHandler;
  onError?: AuthErrorHandler;
  
  // UI state
  className?: string;
}

export interface ExpectedPubkeyAuthProps extends BaseAuthProps {
  // Expected pubkey for validation
  expectedPubkey?: string;
}

// ============================================================================
// Authentication UI Component Props
// ============================================================================

export interface AuthTabsProps {
  // Authentication methods
  onExtensionAuth: () => Promise<void>;
  onNsecAuth: (nsec: string) => Promise<void>;
  onBunkerAuth: (bunkerUri: string) => Promise<void>;
  
  // State
  loadingStates: AuthLoadingStates;
  errors: AuthErrors;
  externalLoading?: boolean;
  
  // Expected pubkey for validation messaging
  expectedPubkey?: string;
  
  // UI configuration
  className?: string;
}

export interface AuthInputProps {
  // Input value
  value: string;
  onChange: (value: string) => void;
  
  // Validation
  isValid?: boolean;
  validationMessage?: string;
  
  // State
  disabled?: boolean;
  placeholder?: string;
  
  // UI configuration
  className?: string;
}

// ============================================================================
// Authentication Error Types
// ============================================================================

export interface AuthMismatchWarning {
  expectedPubkey: string;
  enteredPubkey: string;
}

export interface AuthErrorDisplayProps {
  error: Error | null;
  variant?: "default" | "destructive";
  className?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface AuthValidationHelpers {
  validateNsec: (nsec: string) => ValidationResult;
  validateBunkerUri: (uri: string) => ValidationResult;
  validatePubkey: (pubkey: string) => ValidationResult;
}

// ============================================================================
// Linked Account Types (for LinkedNostrAuthStep)
// ============================================================================

export interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
  };
  isPrimary?: boolean;
  linkedAt?: number;
  isMostRecentlyLinked?: boolean;
}

export interface LinkedAuthProps extends BaseAuthProps {
  expectedPubkey: string | null;
  linkedPubkeys: LinkedPubkey[];
  onBack?: () => void;
  onUseDifferentAccount?: () => void;
}

// ============================================================================
// Authentication Method Configuration
// ============================================================================

export interface AuthMethodConfig {
  extension: {
    enabled: boolean;
    label: string;
    description: string;
  };
  nsec: {
    enabled: boolean;
    label: string;
    description: string;
    showPasswordToggle: boolean;
    showFileUpload: boolean;
  };
  bunker: {
    enabled: boolean;
    label: string;
    description: string;
  };
}

export const DEFAULT_AUTH_METHOD_CONFIG: AuthMethodConfig = {
  extension: {
    enabled: true,
    label: "Extension",
    description: "Sign in using your browser extension"
  },
  nsec: {
    enabled: true,
    label: "Private Key",
    description: "Your private key in nsec format",
    showPasswordToggle: true,
    showFileUpload: true
  },
  bunker: {
    enabled: true,
    label: "Bunker",
    description: "Your NIP-46 bunker URI for remote signing"
  }
};

// ============================================================================
// Re-export types from other auth modules for convenience
// ============================================================================

export type { NostrAuthMethod as AuthMethod } from "@/types/authFlow";