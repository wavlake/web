import React, { useState } from "react";
import { type NLoginType } from '@nostrify/react/login';
import { Dialog } from "@/components/ui/dialog";
import { FirebaseAuthDialog } from "./FirebaseAuthDialog";
import LoginChoiceStep from "./LoginChoiceStep";
import NostrAuthStep from "./NostrAuthStep";
import { useLinkedPubkeys } from "@/hooks/useLinkedPubkeys";
import { getAuth } from "firebase/auth";

interface CompositeLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (login: NLoginType) => void;
}

type AuthStep = 'choice' | 'firebase' | 'nostr';
type AuthChoice = 'nostr' | 'firebase' | 'new-user';

interface FirebaseUser {
  uid: string;
  email: string | null;
}

export const CompositeLoginDialog: React.FC<CompositeLoginDialogProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [step, setStep] = useState<AuthStep>('choice');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  // Fetch linked pubkeys when we have a Firebase user
  const { data: linkedPubkeys = [] } = useLinkedPubkeys(firebaseUser?.email || '');

  const handleChoice = (choice: AuthChoice) => {
    // Map auth choices to appropriate steps
    switch (choice) {
      case 'firebase':
        setStep('firebase');
        break;
      case 'nostr':
      case 'new-user':
        // Both existing Nostr users and new users go to Nostr auth
        setStep('nostr');
        break;
      default:
        setStep('nostr');
    }
  };

  const handleFirebaseSuccess = async () => {
    // Get the actual Firebase user from auth state
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      const user = {
        uid: currentUser.uid,
        email: currentUser.email
      };
      setFirebaseUser(user);
      // Proceed to Nostr auth step with Firebase user context
      setStep('nostr');
    }
  };

  const handleNostrLogin = (login: NLoginType) => {
    // Pass the login through to parent
    onLogin(login);
    onClose();
  };

  const handleClose = () => {
    // Reset state when dialog closes
    setStep('choice');
    setFirebaseUser(null);
    onClose();
  };

  const handleBackToChoice = () => {
    setStep('choice');
    setFirebaseUser(null);
  };

  // Step 1: Choice selection
  if (step === 'choice') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <LoginChoiceStep onSelect={handleChoice} />
      </Dialog>
    );
  }

  // Step 2: Firebase authentication
  if (step === 'firebase') {
    return (
      <FirebaseAuthDialog
        isOpen={true}
        onClose={handleBackToChoice}
        onSuccess={handleFirebaseSuccess}
        title="Sign in with Wavlake Account"
        description="Enter your email and password to sign in"
      />
    );
  }

  // Step 3: Nostr authentication with auto-linking
  if (step === 'nostr') {
    return (
      <Dialog open={true} onOpenChange={handleBackToChoice}>
        <NostrAuthStep
          firebaseUser={firebaseUser || undefined}
          linkedPubkeys={linkedPubkeys}
          onSuccess={handleNostrLogin}
          onBack={handleBackToChoice}
        />
      </Dialog>
    );
  }

  return null;
};

export default CompositeLoginDialog;