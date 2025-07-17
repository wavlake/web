/**
 * Legacy Migration Flow Hook
 *
 * Business logic layer for the complex legacy migration flow that handles
 * Firebase authentication, pubkey checking, and account linking/generation.
 */

import { useCallback } from "react";
import { useLegacyMigrationStateMachine } from "../machines/useLegacyMigrationStateMachine";
import { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
import { NostrAccount, FirebaseUser } from "../machines/types";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useLinkedPubkeys } from "@/hooks/useLinkedPubkeys";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCreateNostrAccount } from "../useCreateNostrAccount";
import { useLinkAccount } from "../useLinkAccount";

export interface UseLegacyMigrationFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useLegacyMigrationStateMachine>;

  // Step-specific handlers
  handleFirebaseAuthentication: (
    email: string,
    password: string
  ) => Promise<void>;
  handleLinkedNostrAuthentication: (
    credentials: NostrCredentials
  ) => Promise<void>;
  handleAccountGeneration: () => Promise<void>;
  handleBringOwnKeypair: () => Promise<void>;
  handleBringOwnKeypairWithCredentials: (
    credentials: NostrCredentials
  ) => Promise<void>;

  // Helper functions
  getStepTitle: () => string;
  getStepDescription: () => string;
  hasLinkedAccounts: () => boolean;
  getExpectedPubkey: () => string | null;
}

export function useLegacyMigrationFlow(): UseLegacyMigrationFlowResult {
  // External dependencies
  const firebaseAuth = useFirebaseAuth();
  const { data: linkedPubkeys, refetch: checkLinkedPubkeys } =
    useLinkedPubkeys();
  const { loginWithExtension, loginWithNsec } = useCurrentUser();
  const { createAccount } = useCreateNostrAccount();
  const { mutateAsync: linkAccounts } = useLinkAccount();

  // Create dependency functions that can access the hook methods
  const firebaseAuthDependency = useCallback(
    async (email: string, password: string) => {
      if (!firebaseAuth.isConfigured) {
        throw new Error("Firebase is not configured for this environment");
      }

      try {
        const userCredential = await firebaseAuth.loginWithEmailAndPassword({
          email,
          password,
        });

        return {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          user: userCredential.user,
        };
      } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        // Re-throw with more user-friendly message for common cases
        if (firebaseError.code === "auth/user-not-found") {
          throw new Error("No account found with this email address");
        } else if (firebaseError.code === "auth/wrong-password") {
          throw new Error("Incorrect password");
        } else if (firebaseError.code === "auth/invalid-email") {
          throw new Error("Invalid email address");
        } else if (firebaseError.code === "auth/user-disabled") {
          throw new Error("This account has been disabled");
        } else {
          throw new Error(firebaseError.message || "Login failed");
        }
      }
    },
    [firebaseAuth]
  );

  // Create other dependency functions
  const checkLinkedPubkeysDependency = useCallback(
    async (firebaseUser: FirebaseUser) => {
      // TODO: Replace with actual API call to check linked pubkeys for Firebase user
      // For now, use the existing hook but ignore the firebaseUser parameter
      void firebaseUser; // Mark as used for future implementation
      await checkLinkedPubkeys();
      return linkedPubkeys || [];
    },
    [checkLinkedPubkeys, linkedPubkeys]
  );

  const authenticateNostrDependency = useCallback(
    async (method: NostrAuthMethod, credentials: NostrCredentials) => {
      switch (method) {
        case "extension":
          return await loginWithExtension();
        case "nsec":
          if (credentials.method === "nsec") {
            return await loginWithNsec(credentials.nsec);
          }
          throw new Error("Invalid credentials for nsec method");
        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }
    },
    [loginWithExtension, loginWithNsec]
  );

  const generateAccountDependency = useCallback(async () => {
    await createAccount();
    // TODO: Return actual account object after createAccount is updated
    // For now, return a placeholder that matches the expected interface
    return {
      pubkey: "placeholder-pubkey",
      profile: {
        name: "Generated Account",
      },
    };
  }, [createAccount]);

  const linkAccountsDependency = useCallback(
    async (firebaseUser: FirebaseUser, nostrAccount: NostrAccount) => {
      // TODO: Implement proper account linking with both user objects
      void firebaseUser; // Mark as used for future implementation
      void nostrAccount; // Mark as used for future implementation
      await linkAccounts();
    },
    [linkAccounts]
  );

  // State machine with dependencies injected
  const stateMachine = useLegacyMigrationStateMachine({
    firebaseAuth: firebaseAuthDependency,
    checkLinkedPubkeys: checkLinkedPubkeysDependency,
    authenticateNostr: authenticateNostrDependency,
    generateAccount: generateAccountDependency,
    linkAccounts: linkAccountsDependency,
  });

  // Step handlers that integrate with UI
  const handleFirebaseAuthentication = useCallback(
    async (email: string, password: string) => {
      const result = await stateMachine.actions.authenticateWithFirebase(
        email,
        password
      );
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    [stateMachine.actions]
  );

  const handleLinkedNostrAuthentication = useCallback(
    async (credentials: NostrCredentials) => {
      const result = await stateMachine.actions.authenticateWithLinkedNostr(
        credentials
      );
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    [stateMachine.actions]
  );

  const handleAccountGeneration = useCallback(async () => {
    const result = await stateMachine.actions.generateNewAccount();
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleBringOwnKeypair = useCallback(async () => {
    // For the choice step, we just transition the state machine
    // The actual credentials will be collected in the BringKeypairStep
    // TODO: Implement state transition for bring-own-keypair choice
    console.log("User chose to bring own keypair");
  }, []);

  const handleBringOwnKeypairWithCredentials = useCallback(
    async (credentials: NostrCredentials) => {
      const result = await stateMachine.actions.bringOwnKeypair(credentials);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    [stateMachine.actions]
  );

  // Helper functions for UI
  const getStepTitle = useCallback(() => {
    switch (stateMachine.step) {
      case "firebase-auth":
        return "Sign in to Legacy Account";
      case "checking-links":
        return "Checking Linked Accounts";
      case "linked-nostr-auth":
        return "Sign in with Linked Nostr Account";
      case "account-choice":
        return "Choose Account Setup";
      case "account-generation":
        return "Generating New Account";
      case "bring-own-keypair":
        return "Import Your Keys";
      case "linking":
        return "Linking Accounts";
      case "complete":
        return "Migration Complete";
      default:
        return "";
    }
  }, [stateMachine.step]);

  const getStepDescription = useCallback(() => {
    switch (stateMachine.step) {
      case "firebase-auth":
        return "Enter your email and password to access your legacy account";
      case "checking-links":
        return "Looking for existing Nostr accounts linked to your email...";
      case "linked-nostr-auth":
        return "We found a Nostr account linked to your email. Please sign in with it.";
      case "account-choice":
        return "How would you like to set up your Nostr account?";
      case "account-generation":
        return "Creating a new Nostr account for you...";
      case "bring-own-keypair":
        return "Import your existing Nostr keys";
      case "linking":
        return "Linking your accounts together...";
      case "complete":
        return "Your accounts have been successfully migrated!";
      default:
        return "";
    }
  }, [stateMachine.step]);

  const hasLinkedAccounts = useCallback(() => {
    return stateMachine.linkedPubkeys.length > 0;
  }, [stateMachine.linkedPubkeys]);

  const getExpectedPubkey = useCallback(() => {
    return stateMachine.expectedPubkey;
  }, [stateMachine.expectedPubkey]);

  return {
    stateMachine,
    handleFirebaseAuthentication,
    handleLinkedNostrAuthentication,
    handleAccountGeneration,
    handleBringOwnKeypair,
    handleBringOwnKeypairWithCredentials,
    getStepTitle,
    getStepDescription,
    hasLinkedAccounts,
    getExpectedPubkey,
  };
}
