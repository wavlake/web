/**
 * Legacy Migration Flow Hook
 *
 * Business logic layer for the complex legacy migration flow that handles
 * Firebase authentication, pubkey checking, and account linking/generation.
 * 
 * ARCHITECTURAL PATTERN - FLOW LAYER:
 * This file demonstrates the separation of concerns in our authentication architecture:
 * 
 * 1. FLOW LAYER (this file):
 *    - Orchestrates external dependencies (Firebase, Nostr, etc.)
 *    - Creates dependency functions that abstract implementation details
 *    - Provides business logic integration between external services
 *    - Handles error translation and user-friendly messaging
 * 
 * 2. STATE MACHINE LAYER (useLegacyMigrationStateMachine):
 *    - Pure state management logic with injected dependencies
 *    - Predictable state transitions and action handling
 *    - Testable with mock dependencies
 * 
 * 3. UI LAYER (components):
 *    - Presents state and calls flow handlers
 *    - No direct access to state machine internals
 */

import { useCallback } from "react";
import { useLegacyMigrationStateMachine } from "../machines/useLegacyMigrationStateMachine";
import { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
import { NostrAccount } from "../machines/types";
import { User as FirebaseUser } from "firebase/auth";
import { type ProfileData } from "@/types/profile";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCreateNostrAccount } from "../useCreateNostrAccount";
import { usePasswordlessCompletion } from "@/hooks/auth/usePasswordlessCompletion";
import { useNostr } from "@nostrify/react";

export interface UseLegacyMigrationFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useLegacyMigrationStateMachine>;

  // Step-specific handlers
  handleFirebaseAuthentication: (
    email: string
  ) => Promise<void>;
  handleLinkedNostrAuthentication: (
    credentials: NostrCredentials
  ) => Promise<void>;
  handlePubkeyMismatchRetry: () => void;
  handlePubkeyMismatchContinue: () => Promise<void>;
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
  const { loginWithExtension, loginWithNsec, addLogin } = useCurrentUser();
  const { createAccount, setupAccount } = useCreateNostrAccount();
  const { storeEmailForPasswordlessAuth, storeFlowContext } = usePasswordlessCompletion();
  const { nostr } = useNostr();

  // Helper function to get the correct action URL for environment
  const getActionCodeSettings = useCallback(() => {
    const isDevelopment = import.meta.env.MODE === 'development';
    const baseUrl = isDevelopment ? 'http://localhost:8080' : window.location.origin;
    
    return {
      url: baseUrl + '/auth/complete',
      handleCodeInApp: true,
    };
  }, []);

  // Create dependency functions that can access the hook methods
  const firebaseAuthDependency = useCallback(
    async (email: string): Promise<FirebaseUser | { emailSent: boolean; email: string }> => {
      if (!firebaseAuth.isConfigured) {
        throw new Error("Firebase is not configured for this environment");
      }

      // If user is already logged in and email is empty, use existing user
      if (!email && firebaseAuth.user) {
        return firebaseAuth.user;
      }

      try {
        // Store email for passwordless completion
        storeEmailForPasswordlessAuth(email);
        
        // Store flow context for resumption after email link click
        storeFlowContext({
          flow: 'legacy-migration',
          step: 'firebase-auth',
          additionalData: {
            email
          }
        });
        
        // Send passwordless login link with environment-appropriate settings
        await firebaseAuth.sendPasswordlessSignInLink({
          email,
          actionCodeSettings: getActionCodeSettings(),
        });

        // Return a special result indicating email was sent successfully
        // The state machine will handle transitioning to email-sent state
        return { emailSent: true, email };
      } catch (error: unknown) {
        // Re-throw with more user-friendly message for common cases
        if (error && typeof error === "object" && "code" in error) {
          const firebaseError = error as { code: string };
          if (firebaseError.code === "auth/user-not-found") {
            throw new Error("No account found with this email address");
          } else if (firebaseError.code === "auth/invalid-email") {
            throw new Error("Invalid email address");
          } else if (firebaseError.code === "auth/user-disabled") {
            throw new Error("This account has been disabled");
          }
        }

        const message = error instanceof Error ? error.message : "Failed to send login link";
        throw new Error(message);
      }
    },
    [firebaseAuth]
  );

  // No longer need checkLinkedPubkeysDependency - using direct API call in state machine

  const authenticateNostrDependency = useCallback(
    async (
      method: NostrAuthMethod,
      credentials: NostrCredentials
    ): Promise<NostrAccount> => {
      let login: any;

      switch (method) {
        case "extension":
          login = await loginWithExtension();
          break;
        case "nsec":
          if (credentials.method !== "nsec")
            throw new Error("Invalid credentials for nsec method");
          login = loginWithNsec(credentials.nsec);
          break;
        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }

      // Convert NLoginType to NostrAccount with proper signer
      const { NUser } = await import("@nostrify/react/login");
      let user: any;

      switch (login.type) {
        case "nsec":
          user = NUser.fromNsecLogin(login);
          break;
        case "extension":
          user = NUser.fromExtensionLogin(login);
          break;
        case "bunker":
          user = NUser.fromBunkerLogin(login, nostr);
          break;
        default:
          throw new Error(`Unsupported login type: ${login.type}`);
      }

      return {
        pubkey: login.pubkey,
        privateKey: login.type === "nsec" ? login.nsec : undefined,
        signer: user.signer,
        profile: undefined, // Will be fetched separately if needed
      };
    },
    [loginWithExtension, loginWithNsec, nostr]
  );

  const createAccountDependency = useCallback(async () => {
    return await createAccount();
  }, [createAccount]);

  // linkAccounts dependency removed - now using direct API calls in state machine

  const setupAccountDependency = useCallback(
    async (profileData: ProfileData | null, generatedName: string) => {
      // Pass through the custom profile data from AccountChoiceStep
      return await setupAccount(profileData, generatedName);
    },
    [setupAccount]
  );

  // State machine with dependencies injected
  const stateMachine = useLegacyMigrationStateMachine({
    firebaseAuth: firebaseAuthDependency,
    authenticateNostr: authenticateNostrDependency,
    createAccount: createAccountDependency,
    addLogin,
    setupAccount: setupAccountDependency,
    nostr,
  });

  // Step handlers that integrate with UI
  const handleFirebaseAuthentication = useCallback(
    async (email: string) => {
      const result = await stateMachine.actions.authenticateWithFirebase(
        email
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

  const handlePubkeyMismatchRetry = useCallback(() => {
    stateMachine.actions.retryLinkedNostrAuth();
  }, [stateMachine.actions]);

  const handlePubkeyMismatchContinue = useCallback(async () => {
    const result = await stateMachine.actions.continueWithNewPubkey();
    if (!result.success) {
      throw result.error || new Error("Failed to continue with new pubkey");
    }
  }, [stateMachine.actions]);

  const handleAccountGeneration = useCallback(async () => {
    const result = await stateMachine.actions.generateNewAccount();
    if (!result.success) {
      throw result.error || new Error("Account generation failed");
    }
  }, [stateMachine.actions, stateMachine.step, stateMachine.firebaseUser]);

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
        return "Sign in to Wavlake";
      case "email-sent":
        return "Check Your Email";
      case "checking-links":
        return "Checking Linked Accounts";
      case "linked-nostr-auth":
        return "Sign in with Linked Account";
      case "pubkey-mismatch":
        return "Account Mismatch";
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
        return "Sign in with your legacy Wavlake account.";
      case "email-sent":
        return "A login link has been sent to your email address.";
      case "checking-links":
        return "";
      case "linked-nostr-auth":
        return "We found an existing account linked to your email. Please sign in with it.";
      case "pubkey-mismatch":
        return "You signed in with a different account than expected. Choose how to proceed.";
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
    handlePubkeyMismatchRetry,
    handlePubkeyMismatchContinue,
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
