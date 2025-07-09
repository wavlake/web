import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { type NLoginType } from "@nostrify/react/login";
import { User as FirebaseUser, getAuth } from "firebase/auth";
import { useCreateAccount } from "@/hooks/useCreateAccount";
import { useLegacyProfile, type LegacyProfile } from "@/hooks/useLegacyProfile";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { EditProfileForm } from "@/components/EditProfileForm";
import { OnboardingContext } from "@/contexts/OnboardingContext";
import { toast } from "@/hooks/useToast";

interface FirebaseUserData {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface LocationState {
  firebaseUserData?: FirebaseUserData;
  legacyProfile?: LegacyProfile;
  source: "onboarding" | "firebase-generation" | "standalone";
  returnPath?: string;
}

/**
 * Dedicated page for all account creation flows.
 * 
 * This page handles:
 * - New user onboarding ("Get Started" flow)
 * - Firebase user generating new Nostr account
 * - Standalone account creation
 * 
 * Context is passed via location state to maintain clean URLs while
 * preserving complex state objects.
 */
const CreateAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createAccount } = useCreateAccount();
  const { autoLink } = useAutoLinkPubkey();
  const { mutateAsync: publishEvent } = useNostrPublish();

  // Extract context from location state
  const locationState = location.state as LocationState | null;
  const firebaseUserData = locationState?.firebaseUserData;
  const source = locationState?.source || "standalone";
  const returnPath = locationState?.returnPath || "/groups";

  // Get the current Firebase user from Firebase Auth (for methods like getIdToken)
  // Only access Firebase for firebase-generation flow
  const firebaseUser = useMemo(() => {
    if (source !== "firebase-generation") return null;
    
    try {
      return getAuth().currentUser;
    } catch (error) {
      console.warn('Firebase not initialized for onboarding flow:', error);
      return null;
    }
  }, [source]);

  // Fetch legacy profile data for Firebase users
  const { data: legacyProfile } = useLegacyProfile(firebaseUser);

  // State management
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createdAccountData, setCreatedAccountData] = useState<{
    login: NLoginType;
    name?: string;
  } | null>(null);
  const [step, setStep] = useState<"creating" | "profile-setup">(
    source === "firebase-generation" ? "profile-setup" : "creating"
  );

  // Start account creation automatically when page loads (except for Firebase generation)
  useEffect(() => {
    if (source !== "firebase-generation" && !createdAccountData && !isCreatingAccount) {
      handleCreateAccount();
    }
  }, [source]);

  const handleCreateAccount = async (profileData?: { name?: string; picture?: string }) => {
    setIsCreatingAccount(true);
    setStep("creating");

    try {
      const accountOptions = {
        generateName: true,
        createWallet: true,
        // Use profile data if provided, otherwise use legacy profile name, otherwise generate
        customName: profileData?.name || legacyProfile?.name || undefined,
      };

      console.log('[CreateAccount] Starting account creation', {
        component: 'CreateAccount',
        action: 'handleCreateAccount',
        source,
        hasFirebaseUser: !!firebaseUser,
        hasLegacyProfile: !!legacyProfile,
        legacyProfileName: legacyProfile?.name,
        timestamp: new Date().toISOString()
      });

      const result = await createAccount(accountOptions);

      // Auto-link to Firebase account if provided
      if (firebaseUser && source === "firebase-generation") {
        console.log('[CreateAccount] Auto-linking to Firebase account');
        try {
          await autoLink(firebaseUser, result.pubkey);
          console.log('[CreateAccount] Auto-linking successful');
        } catch (linkError) {
          console.warn('[CreateAccount] Auto-linking failed, but continuing', linkError);
          // Don't fail the entire flow if linking fails
        }
      }

      // Publish additional profile metadata if picture is provided
      if (profileData?.picture) {
        console.log('[CreateAccount] Publishing profile metadata with picture');
        try {
          const metadata = {
            name: profileData.name || result.name || legacyProfile?.name || '',
            picture: profileData.picture,
            ...(legacyProfile?.about && { about: legacyProfile.about }),
            ...(legacyProfile?.website && { website: legacyProfile.website }),
            ...(legacyProfile?.nip05 && { nip05: legacyProfile.nip05 }),
          };
          
          await publishEvent({
            kind: 0,
            content: JSON.stringify(metadata),
          });
          console.log('[CreateAccount] Profile metadata published successfully');
        } catch (publishError) {
          console.warn('[CreateAccount] Failed to publish profile metadata, but continuing', publishError);
          // Don't fail the entire flow if metadata publishing fails
        }
      }

      // Store account data for profile setup
      setCreatedAccountData({
        login: result.login,
        name: result.name || legacyProfile?.name,
      });

      setIsCreatingAccount(false);

      toast({
        title: "Account Created Successfully",
        description: getSuccessMessage(),
        variant: "default",
      });

      // For Firebase generation, navigate to return path directly
      if (source === "firebase-generation") {
        console.log('[CreateAccount] Firebase generation complete, navigating to return path');
        navigate(returnPath);
      } else {
        // For other sources, move to profile setup step
        setStep("profile-setup");
      }
    } catch (error) {
      console.error('[CreateAccount] Account creation failed:', error);
      setIsCreatingAccount(false);

      toast({
        title: "Account Creation Failed",
        description: "Unable to create your account. Please try again.",
        variant: "destructive",
      });

      // Go back to previous flow
      handleBack();
    }
  };

  const getSuccessMessage = () => {
    switch (source) {
      case "firebase-generation":
        return "Your new Nostr account has been created and linked to your Wavlake account.";
      case "onboarding":
        return "Welcome to Wavlake! Your new account is ready.";
      default:
        return "Your account has been created successfully.";
    }
  };

  const getLoadingSteps = () => {
    const baseSteps = [
      "• Generating secure Nostr keys",
      "• Setting up Lightning wallet",
    ];

    if (source === "firebase-generation" && legacyProfile) {
      return [
        ...baseSteps,
        "• Using your existing profile data",
        "• Linking to your Wavlake account",
      ];
    }

    if (source === "firebase-generation") {
      return [
        ...baseSteps,
        "• Linking to your Wavlake account",
      ];
    }

    return [
      ...baseSteps,
      "• Creating your profile",
    ];
  };

  const handleBack = () => {
    console.log('[CreateAccount] User navigating back', {
      component: 'CreateAccount',
      action: 'handleBack',
      source,
      step,
      hasLocationState: !!locationState
    });

    // Navigate back based on source
    switch (source) {
      case "firebase-generation":
        // Go back to root page - Index.tsx should handle Firebase auth state
        navigate("/");
        break;
      case "onboarding":
        navigate("/");
        break;
      default:
        navigate("/");
    }
  };

  const handleProfileSetupComplete = () => {
    console.log('[CreateAccount] Profile setup completed', {
      component: 'CreateAccount',
      action: 'handleProfileSetupComplete',
      source,
      returnPath,
      navigatingTo: returnPath
    });

    // Navigate to the appropriate destination
    navigate(returnPath);
  };

  const handleFirebaseGenerationComplete = async (profileData?: { name?: string; picture?: string }) => {
    console.log('[CreateAccount] Firebase generation profile completed', {
      component: 'CreateAccount',
      action: 'handleFirebaseGenerationComplete',
      profileData,
      hasFirebaseUser: !!firebaseUser,
      timestamp: new Date().toISOString()
    });

    // Create the account with the profile data
    await handleCreateAccount(profileData);
  };

  const handleProfileSetupBack = () => {
    // For profile setup, "back" means back to account creation
    // But since account is already created, go to the main back flow
    handleBack();
  };

  // Guard against direct access without proper context
  if (!locationState && source === "standalone") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-md mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Create Account</h1>
            <p className="text-muted-foreground">
              Let's get you set up with a new Wavlake account
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={() => handleCreateAccount()} className="w-full" disabled={isCreatingAccount}>
              {isCreatingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create New Account"
              )}
            </Button>
            
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show account creation loading state
  if (step === "creating" || isCreatingAccount) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-md mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Creating Your Account</h1>
            <p className="text-muted-foreground">
              {source === "firebase-generation" 
                ? "Setting up your new Nostr account..."
                : "We'll set up everything for you"}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Setting up your account...
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                {getLoadingSteps().map((step, index) => (
                  <div key={index}>{step}</div>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Show profile setup - either after account creation (onboarding) or before (firebase-generation)
  if (step === "profile-setup") {
    const initialName = createdAccountData?.name || legacyProfile?.name;
    
    return (
      <OnboardingContext.Provider
        value={{ generatedName: initialName || null }}
      >
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background">
          <div className="w-full max-w-lg mx-auto p-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              {source === "firebase-generation" 
                ? "Create Your Nostr Account"
                : "Set your name and pic"}
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              {source === "firebase-generation" && legacyProfile
                ? "We've pre-filled your profile with your existing information. Click 'Save' to create your new Nostr account."
                : source === "firebase-generation"
                ? "Fill in your profile details and click 'Save' to create your new Nostr account."
                : "You can always update them later."}
            </p>
            <EditProfileForm
              showSkipLink={true}
              initialName={initialName}
              legacyProfile={legacyProfile ? { name: legacyProfile.name, picture: legacyProfile.picture } : null}
              source={source}
              onBack={handleProfileSetupBack}
              onComplete={source === "firebase-generation" ? handleFirebaseGenerationComplete : handleProfileSetupComplete}
            />
          </div>
        </div>
      </OnboardingContext.Provider>
    );
  }

  // Fallback state (shouldn't normally reach here)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an issue setting up your account.
          </p>
        </div>

        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default CreateAccount;