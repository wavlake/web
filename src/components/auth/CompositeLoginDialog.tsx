import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { LoginChoiceStep } from './LoginChoiceStep';
import LoginDialog from './LoginDialog';
import { FirebaseAuthDialog } from './FirebaseAuthDialog';
import { useCreateAccount } from '@/hooks/useCreateAccount';
import { useProfileSync } from '@/hooks/useProfileSync';

interface CompositeLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

type AuthStep = 'choice' | 'nostr' | 'firebase';

export const CompositeLoginDialog: React.FC<CompositeLoginDialogProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [step, setStep] = useState<AuthStep>('choice');
  const { createAccount } = useCreateAccount();
  const { syncProfile } = useProfileSync();

  const handleChoiceSelect = (choice: 'get-started' | 'wavlake-account' | 'nostr-account') => {
    switch (choice) {
      case 'get-started':
        handleGetStarted();
        break;
      case 'wavlake-account':
        setStep('firebase');
        break;
      case 'nostr-account':
        setStep('nostr');
        break;
    }
  };

  const handleGetStarted = async () => {
    // For "Get Started" flow, we'll automatically create a new Nostr account
    try {
      const result = await createAccount({
        generateName: true,
        createWallet: true,
      });
      await syncProfile(result.pubkey);
      onLogin();
      onClose();
    } catch (error) {
      console.error('Auto account creation failed:', error);
    }
  };

  const handleNostrLogin = async () => {
    // This is called when LoginDialog completes successfully
    onLogin();
    onClose();
  };

  const handleFirebaseSuccess = async () => {
    // For now, Firebase success should transition to Nostr authentication
    // This is a simplified implementation - the full implementation would
    // check for linked accounts and handle the more complex flow
    setStep('nostr');
  };

  const handleBack = () => {
    setStep('choice');
  };

  const handleClose = () => {
    setStep('choice');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {step === 'choice' && (
        <LoginChoiceStep onSelect={handleChoiceSelect} />
      )}
      {step === 'nostr' && (
        <LoginDialog
          isOpen={true}
          onClose={handleClose}
          onLogin={handleNostrLogin}
        />
      )}
      {step === 'firebase' && (
        <FirebaseAuthDialog
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleFirebaseSuccess}
        />
      )}
    </Dialog>
  );
};