/**
 * Legacy Migration Flow Hook
 *
 * Business logic layer for the complex legacy migration flow that handles
 * Firebase authentication, pubkey checking, and account linking/generation.
 */

import { useCallback } from "react";
import {
  useLegacyMigrationStateMachine,
  LegacyMigrationStateMachineDependencies,
} from "../machines/useLegacyMigrationStateMachine";
import { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
import { NostrAccount } from "../machines/types";
import { User as FirebaseUser } from "firebase/auth";
import { type ProfileData } from "@/types/profile";
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
  handleProfileCompletion: (profileData: ProfileData) => Promise<void>;
  handleMigrationCompletion: () => Promise<void>;

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
  const { loginWithExtension, loginWithNsec, addLogin } = useCurrentUser();
  const { createAccount, setupAccount } = useCreateNostrAccount();
  const { mutateAsync: linkAccounts } = useLinkAccount();

  // Create dependency functions that can access the hook methods
  const firebaseAuthDependency = useCallback(
    async (email: string, password: string): Promise<FirebaseUser> => {
      if (!firebaseAuth.isConfigured) {
        throw new Error("Firebase is not configured for this environment");
      }

      try {
        const userCredential = await firebaseAuth.loginWithEmailAndPassword({
          email,
          password,
        });

        if (!userCredential.user) {
          throw new Error("Authentication failed - no user returned");
        }
        return userCredential.user;
      } catch (error: unknown) {
        // Re-throw with more user-friendly message for common cases
        if (error && typeof error === "object" && "code" in error) {
          const firebaseError = error as { code: string };
          if (firebaseError.code === "auth/user-not-found") {
            throw new Error("No account found with this email address");
          } else if (firebaseError.code === "auth/wrong-password") {
            throw new Error("Incorrect password");
          } else if (firebaseError.code === "auth/invalid-email") {
            throw new Error("Invalid email address");
          } else if (firebaseError.code === "auth/user-disabled") {
            throw new Error("This account has been disabled");
          }
        }
        
        const message =
          error instanceof Error ? error.message : "Login failed";
        throw new Error(message);
      }
    },
    [firebaseAuth]
  );

  // Create other dependency functions
  const checkLinkedPubkeysDependency = useCallback(
    async (firebaseUser: FirebaseUser) => {
      // TODO: Replace with actual API call to check linked pubkeys for Firebase user
      // For now, use the existing hook but ignore the firebaseUser parameter
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
          if (credentials.method !== "nsec")
            throw new Error("Invalid credentials for nsec method");
          return await loginWithNsec(credentials.nsec);
        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }
    },
    [loginWithExtension, loginWithNsec]
  );

  const createAccountDependency = useCallback(async () => {
    return await createAccount();
  }, [createAccount]);

  const generateAccountDependency =
    useCallback(async (): Promise<NostrAccount> => {
      const result = await createAccount();
      // Convert login to NostrAccount
      const pubkey =
        result.login.type === "nsec"
          ? result.login.pubkey
          : result.login.type === "extension"
          ? result.login.pubkey
          : result.login.type === "bunker"
          ? result.login.pubkey
          : "";

      return {
        pubkey,
        signer: result.login,
        profile: {
          name: result.generatedName,
        },
      };
    }, [createAccount]);

  const linkAccountsDependency = useCallback(
    async (firebaseUser: FirebaseUser, nostrAccount: unknown) => {
      // TODO: Implement proper account linking with both user objects
      await linkAccounts();
    },
    [linkAccounts]
  );

  const setupAccountDependency = useCallback(
    async (_profileData: ProfileData | null, generatedName: string) => {
      // Legacy migration doesn't have custom profile data, always pass null
      return await setupAccount(null, generatedName);
    },
    [setupAccount]
  );

  // State machine with dependencies injected
  const stateMachine = useLegacyMigrationStateMachine({
    firebaseAuth: firebaseAuthDependency,
    checkLinkedPubkeys: checkLinkedPubkeysDependency,
    authenticateNostr: authenticateNostrDependency,
    generateAccount: generateAccountDependency,
    createAccount: createAccountDependency,
    linkAccounts: linkAccountsDependency,
    addLogin,
    setupAccount: setupAccountDependency,
  });

  // Step handlers that integrate with UI
  const handleFirebaseAuthentication = useCallback(
    async (email: string, password: string) => {
      const result = await stateMachine.actions.authenticateWithFirebase(
        email,
        password
      );
      if (!result.success) {
        throw result.error || new Error("Firebase authentication failed");
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
        throw result.error || new Error("Firebase authentication failed");
      }
    },
    [stateMachine.actions]
  );

  const handleAccountGeneration = useCallback(async () => {
    const result = await stateMachine.actions.generateNewAccount();
    if (!result.success) {
      throw result.error || new Error("Account generation failed");
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
        throw result.error || new Error("Firebase authentication failed");
      }
    },
    [stateMachine.actions]
  );

  const handleProfileCompletion = useCallback(
    async (profileData: ProfileData) => {
      const result = await stateMachine.actions.completeProfile(profileData);
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to complete profile");
      }
    },
    [stateMachine.actions]
  );

  const handleMigrationCompletion = useCallback(async () => {
    const result = await stateMachine.actions.completeLogin();
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to complete migration");
    }
  }, [stateMachine.actions]);

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
      case "profile-setup":
        return "Set Up Your Profile";
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
        return "Sign in with your legacy Wavlake account and we'll get you migrated.";
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
      case "profile-setup":
        return "Set up your public profile information that others will see";
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
    handleProfileCompletion,
    handleMigrationCompletion,
    getStepTitle,
    getStepDescription,
    hasLinkedAccounts,
    getExpectedPubkey,
  };
}
