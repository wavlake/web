/**
 * Signup Flow Hook
 *
 * Business logic layer for the signup flow that integrates the state machine
 * with external dependencies and provides step-specific handlers for UI.
 */

import { useCallback } from "react";
import { useSignupStateMachine } from "../machines/useSignupStateMachine";
import { useCreateNostrAccount } from "../useCreateNostrAccount";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
import { type ProfileData } from "@/types/profile";

export interface UseSignupFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useSignupStateMachine>;

  // Step-specific handlers
  handleUserTypeSelection: (isArtist: boolean) => Promise<void>;
  handleArtistTypeSelection: (isSolo: boolean) => Promise<void>;
  handleProfileCompletion: (profileData: ProfileData) => Promise<void>;
  handleFirebaseAccountCreation: (
    email: string
  ) => Promise<void>;
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
  const firebaseAuth = useFirebaseAuth();
  const { addLogin } = useCurrentUser();
  const { toast } = useToast();

  // Helper function to get the correct action URL for environment
  const getActionCodeSettings = useCallback(() => {
    const isDevelopment = import.meta.env.MODE === 'development';
    const baseUrl = isDevelopment ? 'http://localhost:8080' : window.location.origin;
    
    return {
      url: baseUrl + '/auth/complete',
      handleCodeInApp: true,
    };
  }, []);

  // State machine with dependencies injected
  const stateMachine = useSignupStateMachine({
    createAccount,
    saveProfile: async () => {
      // Profile data is now properly stored in state machine and passed to setupAccount
    },
    createFirebaseAccount: async (email: string) => {
      // Send passwordless signup link with environment-appropriate settings
      await firebaseAuth.sendPasswordlessSignInLink({
        email,
        actionCodeSettings: getActionCodeSettings(),
      });

      // Return a special result indicating email was sent successfully
      // The state machine will handle transitioning to email-sent state
      return { emailSent: true, email };
    },
    addLogin,
    setupAccount: (profileData: ProfileData | null, generatedName: string) =>
      setupAccount(profileData, generatedName),
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
    async (email: string) => {
      const result = await stateMachine.actions.createFirebaseAccount(
        email
      );
      if (!result.success) {
        throw new Error(
          result.error?.message || "Failed to create Firebase account"
        );
      }
      
      // Check if account was created but linking failed
      const data = result.data as { firebaseUser: unknown; linked?: boolean; linkError?: Error } | undefined;
      if (data?.linked === false) {
        toast({
          title: "Account Created",
          description: "Your email account was created, but we couldn't link it automatically. You can link it later in settings.",
          variant: "default",
        });
      } else if (data?.linked === true) {
        toast({
          title: "Success!",
          description: "Your email backup has been set up and linked to your account.",
          variant: "default",
        });
      }
    },
    [stateMachine.actions, toast]
  );

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
      case "email-sent":
        return "Check Your Email";
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
      case "email-sent":
        return "A signup link has been sent to your email address.";
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
    handleFirebaseBackupSkip,
    handleSignupCompletion,
    getStepTitle,
    getStepDescription,
    shouldShowFirebaseBackup,
  };
}
