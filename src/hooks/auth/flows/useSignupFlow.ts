/**
 * Signup Flow Hook
 *
 * Business logic layer for the signup flow that integrates the state machine
 * with external dependencies and provides step-specific handlers for UI.
 */

import { useCallback } from "react";
import {
  useSignupStateMachine,
  SignupStateMachineDependencies,
} from "../machines/useSignupStateMachine";
import { useCreateNostrAccount } from "../useCreateNostrAccount";
import { useLinkAccount } from "../useLinkAccount";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { type ProfileData } from "@/types/profile";

export interface UseSignupFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useSignupStateMachine>;

  // Step-specific handlers
  handleUserTypeSelection: (isArtist: boolean) => Promise<void>;
  handleArtistTypeSelection: (isSolo: boolean) => Promise<void>;
  handleProfileCompletion: (profileData: ProfileData) => Promise<void>;
  handleFirebaseAccountCreation: (email: string, password: string) => Promise<void>;
  handleFirebaseAccountLinking: () => Promise<void>;
  handleFirebaseBackupSkip: () => Promise<void>;
  handleSignupCompletion: () => Promise<void>;

  // Helper functions
  getStepTitle: () => string;
  getStepDescription: () => string;
  shouldShowFirebaseBackup: () => boolean;
}

export function useSignupFlow(): UseSignupFlowResult {
  // External dependencies
  const { createAccount, setupAccount } = useCreateNostrAccount();
  const { mutateAsync: linkAccounts } = useLinkAccount();
  const { registerWithEmailAndPassword } = useFirebaseAuth();
  const { addLogin } = useCurrentUser();

  // State machine with dependencies injected
  const stateMachine = useSignupStateMachine({
    createAccount,
    saveProfile: async (data: ProfileData) => {
      // Profile data is now properly stored in state machine and passed to setupAccount
    },
    createFirebaseAccount: async (email: string, password: string) => {
      const result = await registerWithEmailAndPassword({ email, password });
      return result.user;
    },
    linkAccounts,
    addLogin,
    setupAccount: (profileData: ProfileData | null, generatedName: string) => setupAccount(profileData, generatedName),
  });

  // Step handlers that integrate with UI
  const handleUserTypeSelection = useCallback(
    async (isArtist: boolean) => {
      const result = await stateMachine.actions.setUserType(isArtist);
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to set user type");
      }
    },
    [stateMachine.actions]
  );

  const handleArtistTypeSelection = useCallback(
    async (isSolo: boolean) => {
      const result = await stateMachine.actions.setArtistType(isSolo);
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to set artist type");
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

  const handleFirebaseAccountCreation = useCallback(
    async (email: string, password: string) => {
      const result = await stateMachine.actions.createFirebaseAccount(
        email,
        password
      );
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to create Firebase account");
      }
    },
    [stateMachine.actions]
  );

  const handleFirebaseAccountLinking = useCallback(async () => {
    const result = await stateMachine.actions.linkFirebaseAccount();
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to link Firebase account");
    }
  }, [stateMachine.actions]);

  const handleFirebaseBackupSkip = useCallback(async () => {
    stateMachine.actions.skipFirebaseBackup();
  }, [stateMachine.actions]);

  const handleSignupCompletion = useCallback(async () => {
    const result = await stateMachine.actions.completeLogin();
    
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to complete signup");
    }
  }, [stateMachine.actions]);

  // Helper functions for UI
  const getStepTitle = useCallback(() => {
    switch (stateMachine.step) {
      case "user-type":
        return "Sign Up";
      case "artist-type":
        return "Artist Type";
      case "profile-setup":
        return stateMachine.isArtist
          ? "Create Artist Profile"
          : "Create Profile";
      case "firebase-backup":
        return "Create Email Account";
      case "firebase-linking":
        return "Link Accounts";
      case "complete":
        return "Welcome!";
      default:
        return "";
    }
  }, [stateMachine.step, stateMachine.isArtist]);

  const getStepDescription = useCallback(() => {
    switch (stateMachine.step) {
      case "user-type":
        return "Select whether you want to sign up as an artist or a listener. This helps us tailor your experience.";
      case "artist-type":
        return "Are you a solo artist or part of a band/group?";
      case "profile-setup":
        if (stateMachine.isArtist) {
          return stateMachine.isSoloArtist
            ? "This is your public solo artist profile that will be visible to others."
            : "This is your public band/group profile that will be visible to others. You'll be able to make individual member profiles later.";
        }
        return "Set up your public profile";
      case "firebase-backup":
        return "Create an email account to backup your Nostr identity and access additional features";
      case "firebase-linking":
        return "Linking your email account to your Nostr identity for backup and recovery";
      case "complete":
        return "You're all set up!";
      default:
        return "";
    }
  }, [stateMachine.step, stateMachine.isArtist, stateMachine.isSoloArtist]);

  const shouldShowFirebaseBackup = useCallback(() => {
    return stateMachine.isArtist;
  }, [stateMachine.isArtist]);

  return {
    stateMachine,
    handleUserTypeSelection,
    handleArtistTypeSelection,
    handleProfileCompletion,
    handleFirebaseAccountCreation,
    handleFirebaseAccountLinking,
    handleFirebaseBackupSkip,
    handleSignupCompletion,
    getStepTitle,
    getStepDescription,
    shouldShowFirebaseBackup,
  };
}
