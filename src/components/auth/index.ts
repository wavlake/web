/**
 * Authentication Components
 *
 * This module exports all authentication-related components including
 * forms, flows, and steps for the new state machine-based auth system.
 */

// Core authentication forms
export { NostrAuthForm } from "./NostrAuthForm";
export { FirebaseAuthForm } from "./FirebaseAuthForm";
export { LoginButton } from "./ui/LoginButton";

// Flow components
export { NostrLoginFlow } from "./flows/NostrLoginFlow";

// Step components
export { NostrAuthStep } from "./steps/shared/NostrAuthStep";

// Utility components
export { AccountDiscoveryScreen } from "./AccountDiscoveryScreen";
export { LinkedAccountCard } from "./LinkedAccountCard";
export { PubkeyMismatchAlert } from "./PubkeyMismatchAlert";
export { UnlinkConfirmDialog } from "./UnlinkConfirmDialog";
export { FirebaseActionGuard } from "./FirebaseActionGuard";
export { GenericStep } from "./GenericStep";

// Legacy/Migration components
export { AccountGeneration } from "./AccountGeneration";
