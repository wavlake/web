import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LoginChoiceStep, LoginChoice } from './LoginChoiceStep';
import LoginDialog from './LoginDialog';
import { FirebaseAuthDialog } from './FirebaseAuthDialog';
import { useCreateAccount } from '@/hooks/useCreateAccount';
import { useProfileSync } from '@/hooks/useProfileSync';
import { toast } from '@/hooks/useToast';

/**
 * Props for the CompositeLoginDialog component
 */
interface CompositeLoginDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback fired when dialog should close */
  onClose: () => void;
  /** Callback fired when user successfully logs in */
  onLogin: () => void;
}

/**
 * Available authentication steps in the composite flow
 */
type AuthStep = 'choice' | 'nostr' | 'firebase';

/**
 * CompositeLoginDialog orchestrates the enhanced authentication flow,
 * presenting users with three distinct authentication options and managing
 * the state transitions between different authentication steps.
 */
export const CompositeLoginDialog: React.FC<CompositeLoginDialogProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [step, setStep] = useState<AuthStep>('choice');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const { createAccount } = useCreateAccount();
  const { syncProfile } = useProfileSync();

  /**
   * Handles user selection from the login choice step
   */
  const handleChoiceSelect = (choice: LoginChoice) => {
    switch (choice) {
      case LoginChoice.GET_STARTED:
        handleGetStarted();
        break;
      case LoginChoice.WAVLAKE_ACCOUNT:
        setStep('firebase');
        break;
      case LoginChoice.NOSTR_ACCOUNT:
        setStep('nostr');
        break;
      default:
        console.warn('Unknown login choice:', choice);
    }
  };

  /**
   * Handles the "Get Started" flow by creating a new account automatically
   */
  const handleGetStarted = async () => {
    setIsCreatingAccount(true);
    
    try {
      const result = await createAccount({
        generateName: true,
        createWallet: true,
      });
      
      await syncProfile(result.pubkey);
      
      toast({
        title: 'Account Created Successfully',
        description: 'Welcome to Wavlake! Your new account is ready.',
        variant: 'default'
      });
      
      onLogin();
      onClose();
    } catch (error) {
      console.error('Auto account creation failed:', error);
      
      toast({
        title: 'Account Creation Failed',
        description: 'Unable to create your account. Please try again or choose a different sign-in method.',
        variant: 'destructive'
      });
      
      // Return to choice step so user can try alternative methods
      setStep('choice');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  /**
   * Handles successful Nostr authentication
   */
  const handleNostrLogin = () => {
    onLogin();
    onClose();
  };

  /**
   * Handles successful Firebase authentication
   * TODO: Implement enhanced flow with account linking detection
   */
  const handleFirebaseSuccess = () => {
    // Future enhancement: check for linked accounts and handle complex flow
    setStep('nostr');
  };

  /**
   * Navigates back to the choice step
   */
  const handleBack = () => {
    setStep('choice');
  };

  /**
   * Resets state and closes the dialog
   */
  const handleClose = () => {
    setStep('choice');
    setIsCreatingAccount(false);
    onClose();
  };

  /**
   * Enhanced close handler that provides back navigation context
   */
  const handleCloseWithBackNavigation = () => {
    if (step !== 'choice') {
      // If user is not on choice step, go back instead of closing
      handleBack();
    } else {
      handleClose();
    }
  };

  /**
   * BackButton component for navigation between authentication steps
   */
  const BackButton: React.FC = () => (
    <div 
      className="fixed top-4 left-4 z-[60]"
      style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 60 }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm"
        aria-label="Go back to authentication options"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
    </div>
  );

  // Render appropriate step content
  if (step === 'nostr') {
    return (
      <>
        <LoginDialog
          isOpen={isOpen}
          onClose={handleCloseWithBackNavigation}
          onLogin={handleNostrLogin}
        />
        <BackButton />
      </>
    );
  }

  if (step === 'firebase') {
    return (
      <>
        <FirebaseAuthDialog
          isOpen={isOpen}
          onClose={handleCloseWithBackNavigation}
          onSuccess={handleFirebaseSuccess}
          title="Sign in to Wavlake"
          description="Use your existing Wavlake account credentials"
        />
        <BackButton />
      </>
    );
  }

  // Default to choice step
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <LoginChoiceStep onSelect={handleChoiceSelect} />
    </Dialog>
  );
};