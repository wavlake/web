/**
 * Authentication Hooks
 *
 * This module exports the authentication hooks for account management
 * and authentication flows.
 */

// State machines and flows
export * from "./machines";
export * from "./flows";

// Account management hooks
export { useCreateNostrAccount } from "./useCreateNostrAccount";
export { useLinkAccount } from "./useLinkAccount";
export { useUnlinkAccount } from "./useUnlinkAccount";

// Utility functions
export * from "./utils/authHelpers";
export * from "./utils/stateMachineUtils";
