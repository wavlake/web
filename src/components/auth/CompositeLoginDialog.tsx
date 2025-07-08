import React, { useState, useMemo, useCallback } from 'react';
import { type NLoginType } from '@nostrify/react/login';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { LoginChoiceStep, LoginChoice } from './LoginChoiceStep';
import LoginDialog from './LoginDialog';
import { FirebaseAuthDialog } from './FirebaseAuthDialog';
import NostrAuthStep from './NostrAuthStep';
import { useCreateAccount } from '@/hooks/useCreateAccount';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useLinkedPubkeys } from '@/hooks/useLinkedPubkeys';
import { toast } from '@/hooks/useToast';
import { getAuth } from 'firebase/auth';

/**
 * Props for the CompositeLoginDialog component
 */
interface CompositeLoginDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback fired when dialog should close */
  onClose: () => void;
  /** Callback fired when user successfully logs in */
  onLogin: (login?: NLoginType) => void;
}

/**
 * Available authentication steps in the composite flow
 */
type AuthStep = 'choice' | 'nostr' | 'firebase';

interface FirebaseUser {
  uid: string;
  email: string | null;
}

/**
 * CompositeLoginDialog orchestrates the enhanced authentication flow,
 * presenting users with three distinct authentication options and managing
 * the state transitions between different authentication steps.
 * 
 * Features:
 * - Three-step authentication flow (choice → auth → completion)
 * - Back navigation between steps
 * - Loading states and error handling
 * - Auto-account creation for new users
 * - Integration with existing authentication components
 * 
 * @param isOpen - Whether the dialog is currently open
 * @param onClose - Callback fired when dialog should close
 * @param onLogin - Callback fired when user successfully logs in
 */
export const CompositeLoginDialog: React.FC<CompositeLoginDialogProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [step, setStep] = useState<AuthStep>('choice');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  const { createAccount } = useCreateAccount();
  const { syncProfile } = useProfileSync();
  
  // Fetch linked pubkeys when we have a Firebase user
  const { data: linkedPubkeys = [] } = useLinkedPubkeys(firebaseUser?.email || '');

  /**
   * Handles user selection from the login choice step with proper enum validation
   */
  const handleChoiceSelect = (choice: LoginChoice) => {
    // Validate that the choice is a valid enum value
    if (!Object.values(LoginChoice).includes(choice)) {
      console.error('Invalid login choice received:', choice);
      toast({
        title: 'Invalid Selection',
        description: 'Please try selecting an authentication option again.',
        variant: 'destructive'
      });
      return;
    }

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
      
      onLogin(result.login);
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
   * Handles successful Firebase authentication and transitions to Nostr authentication step
   */
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

  /**
   * Handles successful Nostr authentication
   */
  const handleNostrLogin = (login?: NLoginType) => {
    // Pass the login through to parent if provided
    onLogin(login);
    onClose();
  };

  /**
   * Navigates back to the choice step
   */
  const handleBack = useCallback(() => {
    setStep('choice');
    setFirebaseUser(null);
  }, []);

  /**
   * Resets state and closes the dialog
   */
  const handleClose = () => {
    setStep('choice');
    setIsCreatingAccount(false);
    setFirebaseUser(null);
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
   * BackButton component for navigation between authentication steps.
   * Memoized to prevent unnecessary re-renders.
   */
  const BackButton = useMemo(() => (
    <div className="fixed top-4 left-4 z-[60]">
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
  ), [handleBack]);

  // Show loading dialog during account creation
  if (isCreatingAccount) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-0 relative">
            <DialogTitle className="text-xl font-semibold text-center">
              Creating Your Account
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-2">
              Please wait while we set up your new Wavlake account
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-8 flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Setting up your account...
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Generating secure Nostr keys</div>
                <div>• Creating Lightning wallet</div>
                <div>• Syncing profile information</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render appropriate step content
  if (step === 'nostr') {
    // Use NostrAuthStep when we have Firebase user context, otherwise use LoginDialog
    if (firebaseUser) {
      return (
        <Dialog open={isOpen} onOpenChange={handleBack}>
          <NostrAuthStep
            firebaseUser={firebaseUser}
            linkedPubkeys={linkedPubkeys}
            onSuccess={handleNostrLogin}
            onBack={handleBack}
          />
        </Dialog>
      );
    } else {
      return (
        <>
          <LoginDialog
            isOpen={isOpen}
            onClose={handleCloseWithBackNavigation}
            onLogin={() => handleNostrLogin()}
          />
          {isOpen && BackButton}
        </>
      );
    }
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
        {isOpen && BackButton}
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

export default CompositeLoginDialog;