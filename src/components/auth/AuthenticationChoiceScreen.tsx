import React, { useState, useMemo, useCallback } from "react";
import { type NLoginType } from "@nostrify/react/login";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LoginChoiceContent, LoginChoice } from "./LoginChoiceContent";
import LoginDialog from "./LoginDialog";
import { FirebaseAuthDialog } from "./FirebaseAuthDialog";
import NostrAuthStep from "./NostrAuthStep";
import { useCreateAccount } from "@/hooks/useCreateAccount";
import { useProfileSync } from "@/hooks/useProfileSync";
import { useLinkedPubkeys } from "@/hooks/useLinkedPubkeys";
import { toast } from "@/hooks/useToast";
import { getAuth } from "firebase/auth";
import { FirebaseUser } from "@/types/auth";

/**
 * Props for the AuthenticationChoiceScreen component
 */
interface AuthenticationChoiceScreenProps {
  /** Callback fired when user successfully logs in (existing users) */
  onLogin: (login?: NLoginType) => void;
  /** Callback fired when a new user account is created */
  onNewUserCreated?: (login: NLoginType, generatedName?: string) => void;
}

/**
 * Available authentication steps in the composite flow
 */
type AuthStep = "choice" | "nostr" | "firebase";

/**
 * AuthenticationChoiceScreen provides the main authentication interface for the landing page.
 * This is the non-dialog version of CompositeLoginDialog, designed to be displayed directly
 * on the Index page for unauthenticated users.
 *
 * Features:
 * - Three-step authentication flow (choice → auth → completion)
 * - Back navigation between steps
 * - Loading states and error handling
 * - Auto-account creation for new users
 * - Integration with existing authentication components
 *
 * @param onLogin - Callback fired when user successfully logs in
 */
export const AuthenticationChoiceScreen: React.FC<
  AuthenticationChoiceScreenProps
> = ({ onLogin, onNewUserCreated }) => {
  const [step, setStep] = useState<AuthStep>("choice");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const { createAccount } = useCreateAccount();
  const { syncProfile } = useProfileSync();

  // Fetch linked pubkeys when we have a Firebase user
  const { data: linkedPubkeys = [] } = useLinkedPubkeys(
    firebaseUser || undefined
  );

  /**
   * Handles user selection from the login choice step with proper enum validation
   */
  const handleChoiceSelect = (choice: LoginChoice) => {
    // Validate that the choice is a valid enum value
    if (!Object.values(LoginChoice).includes(choice)) {
      console.error("Invalid login choice received:", choice);
      toast({
        title: "Invalid Selection",
        description: "Please try selecting an authentication option again.",
        variant: "destructive",
      });
      return;
    }

    switch (choice) {
      case LoginChoice.GET_STARTED:
        handleGetStarted();
        break;
      case LoginChoice.WAVLAKE_ACCOUNT:
        setStep("firebase");
        break;
      case LoginChoice.NOSTR_ACCOUNT:
        setStep("nostr");
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

      // Call the new user callback instead of login to trigger profile edit screen
      if (onNewUserCreated) {
        onNewUserCreated(result.login, result.name);
      } else {
        // Fallback to login if callback not provided
        onLogin(result.login);
      }
    } catch (error) {
      console.error("Auto account creation failed:", error);

      toast({
        title: "Account Creation Failed",
        description:
          "Unable to create your account. Please try again or choose a different sign-in method.",
        variant: "destructive",
      });

      // Return to choice step so user can try alternative methods
      setStep("choice");
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
        email: currentUser.email,
        getIdToken: () => currentUser.getIdToken(),
      };
      setFirebaseUser(user);
      // Proceed to Nostr auth step with Firebase user context
      setStep("nostr");
    }
  };

  /**
   * Handles successful Nostr authentication
   */
  const handleNostrLogin = (login?: NLoginType) => {
    // Pass the login through to parent if provided
    onLogin(login);
  };

  /**
   * Navigates back to the choice step
   */
  const handleBack = useCallback(() => {
    setStep("choice");
    setFirebaseUser(null);
  }, []);

  /**
   * BackButton component for navigation between authentication steps.
   * Memoized to prevent unnecessary re-renders.
   */
  const BackButton = useMemo(
    () => (
      <div className="absolute top-4 left-4 z-10">
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
    ),
    [handleBack]
  );

  // Show loading screen during account creation
  if (isCreatingAccount) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background p-8">
        <div className="w-full max-w-md mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Creating Your Account</h1>
            <p className="text-muted-foreground">
              Please wait while we set up your new Wavlake account
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Setting up your account...
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Generating secure Nostr keys</div>
                <div>• Creating Lightning wallet</div>
                <div>• Setting up your profile</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Firebase authentication step
  if (step === "firebase") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background p-8 relative">
        {BackButton}
        <div className="w-full max-w-md mx-auto">
          <FirebaseAuthDialog
            isOpen={true}
            onClose={handleBack}
            onSuccess={handleFirebaseSuccess}
            title="Sign in to Wavlake"
            description="Use your existing Wavlake account credentials"
          />
        </div>
      </div>
    );
  }

  // Render Nostr authentication step
  if (step === "nostr") {
    // Use NostrAuthStep when we have Firebase user context, otherwise use LoginDialog
    if (firebaseUser) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background p-8 relative">
          {BackButton}
          <div className="w-full max-w-md mx-auto">
            <NostrAuthStep
              firebaseUser={firebaseUser}
              linkedPubkeys={linkedPubkeys}
              onSuccess={handleNostrLogin}
              onBack={handleBack}
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background p-8 relative">
          {BackButton}
          <div className="w-full max-w-md mx-auto">
            <LoginDialog
              isOpen={true}
              onClose={handleBack}
              onLogin={() => handleNostrLogin()}
            />
          </div>
        </div>
      );
    }
  }

  // Default to choice step - render as main page content
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background p-8">
      <div className="w-full max-w-md mx-auto px-8 text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src="/wavlake-icon-96.png"
            alt="Wavlake"
            width={64}
            height={64}
            className="object-contain"
          />
          <h1 className="text-4xl font-bold">Wavlake</h1>
        </div>
        <div className="text-lg text-muted-foreground font-extralight">
          Stream Anywhere, Earn Everywhere
        </div>
      </div>

      {/* Render the choice step content without dialog wrapper */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">Welcome to Wavlake</h2>
            <p className="text-muted-foreground mt-2">
              Choose how you'd like to get started
            </p>
          </div>

          <LoginChoiceContent onSelect={handleChoiceSelect} />
        </div>
      </div>
    </div>
  );
};

export default AuthenticationChoiceScreen;
