/**
 * Decomposed Authentication Flow Hooks
 *
 * This module exports the decomposed authentication flow hooks that replace
 * the monolithic useV3AuthFlow hook with focused, single-responsibility hooks.
 */

// Core state management
export { useAuthFlowState } from "./useAuthFlowState";
export type {
  V3AuthStep,
  V3AuthState,
  V3AuthAction,
  UseAuthFlowStateResult,
} from "./useAuthFlowState";

// Business logic hooks (legacy)
export { useSignupFlow } from "./useSignupFlow";
export type {
  UseSignupFlowOptions,
  UseSignupFlowResult,
} from "./useSignupFlow";

export { useSigninFlow } from "./useSigninFlow";
export type {
  UseSigninFlowOptions,
  UseSigninFlowResult,
} from "./useSigninFlow";

// Main coordinator
export { useAuthFlowCoordinator } from "./useAuthFlowCoordinator";
export type { UseAuthFlowCoordinatorResult } from "./useAuthFlowCoordinator";

// State machines and flows
export * from "./machines";
export * from "./flows";

// Flow hooks are now exported via * from "./flows" above

// Utility functions
export {
  isSignupStep,
  getNextSignupStep,
  getSignupProgress,
} from "./useSignupFlow";

export {
  isSigninStep,
  getNextSigninStep,
  getSigninProgress,
  shouldShowLegacyMigration,
  getAuthMethodDescription,
} from "./useSigninFlow";

export {
  getCurrentFlowType,
  getFlowProgress,
  canGoBackFromStep,
} from "./useAuthFlowCoordinator";

// These utility functions need to be implemented if needed
// export { isLoginFlowActive, isLoginFlowComplete } from "./flows/useNostrLoginFlow";
