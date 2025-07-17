/**
 * Nostr Login Flow Hook
 *
 * Business logic layer for the simple Nostr login flow that integrates
 * the state machine with Nostr authentication methods.
 */

import { useCallback } from "react";
import {
  useNostrLoginStateMachine,
  NostrLoginStateMachineDependencies,
} from "../machines/useNostrLoginStateMachine";
import { NostrAuthMethod } from "@/types/authFlow";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface UseNostrLoginFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useNostrLoginStateMachine>;

  // Step-specific handlers
  handleNostrAuthentication: () => Promise<void>;

  // Helper functions
  getStepTitle: () => string;
  getStepDescription: () => string;
  getSupportedMethods: () => NostrAuthMethod[];
}

export function useNostrLoginFlow(): UseNostrLoginFlowResult {
  // External dependencies
  const { loginWithExtension, loginWithNsec, loginWithBunker } =
    useCurrentUser();

  // State machine with dependencies injected
  const stateMachine = useNostrLoginStateMachine({
    authenticate: async (method: NostrAuthMethod, credentials: any) => {
      switch (method) {
        case "extension":
          return await loginWithExtension();
        case "nsec":
          return await loginWithNsec(credentials.nsec);
        case "bunker":
          return await loginWithBunker(credentials.bunkerUri);
        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }
    },
    syncProfile: async () => {
      // TODO: Implementation for syncing profile after auth
      console.log("Syncing profile after authentication");
    },
  });

  // Step handlers that integrate with UI
  const handleNostrAuthentication = useCallback(async () => {
    // For now, use a default method since NostrAuthForm doesn't provide method/credentials
    // This will be enhanced when the NostrAuthForm is updated to provide more details
    const result = await stateMachine.actions.authenticateWithNostr(
      "extension",
      {}
    );
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  // Helper functions for UI
  const getStepTitle = useCallback(() => {
    switch (stateMachine.step) {
      case "auth":
        return "Sign in";
      case "complete":
        return "Welcome back!";
      default:
        return "";
    }
  }, [stateMachine.step]);

  const getStepDescription = useCallback(() => {
    switch (stateMachine.step) {
      case "auth":
        return "Sign in to Wavlake";
      case "complete":
        return "You're signed in successfully";
      default:
        return "";
    }
  }, [stateMachine.step]);

  const getSupportedMethods = useCallback((): NostrAuthMethod[] => {
    const methods: NostrAuthMethod[] = ["nsec"];

    // Check if window.nostr is available (browser extension)
    if (typeof window !== "undefined" && window.nostr) {
      methods.unshift("extension");
    }

    // Bunker is always supported
    methods.push("bunker");

    return methods;
  }, []);

  return {
    stateMachine,
    handleNostrAuthentication,
    getStepTitle,
    getStepDescription,
    getSupportedMethods,
  };
}
