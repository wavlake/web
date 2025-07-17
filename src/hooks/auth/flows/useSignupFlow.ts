/**
 * Signup Flow Hook
 * 
 * Business logic layer for the signup flow that integrates the state machine
 * with external dependencies and provides step-specific handlers for UI.
 */

import { useCallback } from 'react';
import { useSignupStateMachine, SignupStateMachineDependencies } from '../machines/useSignupStateMachine';
import { useCreateNostrAccount } from '../useCreateNostrAccount';
import { useLinkAccount } from '../useLinkAccount';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';

export interface UseSignupFlowResult {
  // State machine interface
  stateMachine: ReturnType<typeof useSignupStateMachine>;
  
  // Step-specific handlers
  handleUserTypeSelection: (isArtist: boolean) => Promise<void>;
  handleArtistTypeSelection: (isSolo: boolean) => Promise<void>;
  handleProfileCompletion: (profileData: any) => Promise<void>;
  handleFirebaseBackupSetup: (email: string, password: string) => Promise<void>;
  
  // Helper functions
  getStepTitle: () => string;
  getStepDescription: () => string;
  shouldShowFirebaseBackup: () => boolean;
}

export function useSignupFlow(): UseSignupFlowResult {
  // External dependencies
  const { createAccount } = useCreateNostrAccount();
  const { mutateAsync: linkAccounts } = useLinkAccount();
  const { registerWithEmailAndPassword } = useFirebaseAuth();
  
  // State machine with dependencies injected
  const stateMachine = useSignupStateMachine({
    createAccount,
    saveProfile: async (data: any) => {
      // TODO: Implementation for saving profile
      console.log("Saving profile:", data);
    },
    createFirebaseAccount: async (email: string, password: string) => {
      const result = await registerWithEmailAndPassword({ email, password });
      return result.user;
    },
    linkAccounts,
  });

  // Step handlers that integrate with UI
  const handleUserTypeSelection = useCallback(async (isArtist: boolean) => {
    const result = await stateMachine.actions.setUserType(isArtist);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleArtistTypeSelection = useCallback(async (isSolo: boolean) => {
    const result = await stateMachine.actions.setArtistType(isSolo);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleProfileCompletion = useCallback(async (profileData: any) => {
    const result = await stateMachine.actions.completeProfile(profileData);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  const handleFirebaseBackupSetup = useCallback(async (email: string, password: string) => {
    const result = await stateMachine.actions.setupFirebaseBackup(email, password);
    if (!result.success) {
      throw new Error(result.error);
    }
  }, [stateMachine.actions]);

  // Helper functions for UI
  const getStepTitle = useCallback(() => {
    switch (stateMachine.step) {
      case "user-type":
        return "Welcome to Wavlake";
      case "artist-type":
        return "Artist Type";
      case "profile-setup":
        return stateMachine.isArtist ? "Create Artist Profile" : "Create Profile";
      case "firebase-backup":
        return "Add Email Backup";
      case "complete":
        return "Welcome!";
      default:
        return "";
    }
  }, [stateMachine.step, stateMachine.isArtist]);

  const getStepDescription = useCallback(() => {
    switch (stateMachine.step) {
      case "user-type":
        return "Choose how you want to use Wavlake";
      case "artist-type":
        return "Are you a solo artist or part of a band/group?";
      case "profile-setup":
        return "Set up your public profile";
      case "firebase-backup":
        return "Add an email to help recover your account if needed";
      case "complete":
        return "You're all set up!";
      default:
        return "";
    }
  }, [stateMachine.step]);

  const shouldShowFirebaseBackup = useCallback(() => {
    return stateMachine.isArtist;
  }, [stateMachine.isArtist]);

  return {
    stateMachine,
    handleUserTypeSelection,
    handleArtistTypeSelection,
    handleProfileCompletion,
    handleFirebaseBackupSetup,
    getStepTitle,
    getStepDescription,
    shouldShowFirebaseBackup,
  };
}