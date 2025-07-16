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
  UseAuthFlowStateResult 
} from "./useAuthFlowState";

// Business logic hooks
export { useSignupFlow } from "./useSignupFlow";
export type { 
  UseSignupFlowOptions, 
  UseSignupFlowResult 
} from "./useSignupFlow";

export { useSigninFlow } from "./useSigninFlow";
export type { 
  UseSigninFlowOptions, 
  UseSigninFlowResult 
} from "./useSigninFlow";

export { useAccountLinkingFlow } from "./useAccountLinkingFlow";
export type { 
  UseAccountLinkingFlowOptions, 
  UseAccountLinkingFlowResult 
} from "./useAccountLinkingFlow";

// Main coordinator
export { useAuthFlowCoordinator } from "./useAuthFlowCoordinator";
export type { UseAuthFlowCoordinatorResult } from "./useAuthFlowCoordinator";

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
  isAccountLinkingStep,
  getLinkingStatusDescription,
  validateLinkingRequirements,
  getRecommendedAction,
  formatAccountInfo,
} from "./useAccountLinkingFlow";

export {
  getCurrentFlowType,
  getFlowProgress,
  canGoBackFromStep,
} from "./useAuthFlowCoordinator";