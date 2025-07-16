import { Sparkles, Mail, HeadphonesIcon, MicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericStep } from "@/components/auth/v3/GenericStep";
import { NostrAuthForm } from "@/components/auth/v3/NostrAuthForm";
import { FirebaseAuthForm } from "@/components/auth/v3/FirebaseAuthForm";
import { EditProfileForm } from "@/components/EditProfileForm";
import { useV3AuthFlow } from "@/hooks/useV3AuthFlow";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const StartHeader = () => {
  return (
    <div className="w-full sm:max-w-md mx-auto text-center mb-6 sm:mb-8 px-4 sm:px-0">
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <img
          src="/wavlake-icon-96.png"
          alt="Wavlake"
          width={48}
          height={48}
          className="object-contain sm:w-16 sm:h-16"
        />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Wavlake</h1>
      </div>
      <p className="text-base sm:text-lg text-muted-foreground">
        Stream Anywhere, Earn Everywhere
      </p>
    </div>
  );
};
interface AuthMethodOption {
  method: "sign-in" | "sign-up";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  variant?: "default" | "primary";
}

const AUTH_METHODS: AuthMethodOption[] = [
  {
    method: "sign-up",
    icon: Sparkles,
    title: "Get Started",
    description: "", //"New to Wavlake? We'll create an account for you",
    variant: "primary",
  },
  {
    method: "sign-in",
    icon: Mail,
    title: "Sign in",
    description: "", //"Sign in with your Wavlake or Nostr account",
  },
];
export default function Login() {
  const navigate = useNavigate();
  
  // Use the consolidated auth flow
  const {
    step,
    isArtist,
    isSoloArtist,
    firebaseUser,
    canGoBack,
    error,
    currentUser,
    metadata,
    isLegacyArtist,
    primaryPubkey,
    artistsList,
    isLoadingLegacyArtists,
    isCreating,
    handleBack,
    handleSelectSignup,
    handleSelectSignin,
    handleSelectLegacyAuth,
    handleSetUserType,
    handleSetArtistType,
    handleNostrAuthComplete,
    handleLegacyAuthComplete,
    handleAccountLinkingComplete,
    handleProfileCreated,
    handleFirebaseBackupComplete,
    handleWelcomeComplete,
    reset,
    setError,
    clearError,
    logout,
  } = useV3AuthFlow();

  // Helper functions for profile step (from SignUp.tsx)
  const getProfileStepDescription = () => {
    if (isArtist) {
      return isSoloArtist
        ? "This is your public solo artist profile that will be visible to others."
        : "This is your public band/group profile that will be visible to others. You'll be able to make individual member profiles later.";
    }
    return "This is your public user profile that will be visible to others.";
  };

  const getProfileTitle = () => {
    if (isArtist) {
      return isSoloArtist
        ? "Create Solo Artist Profile"
        : "Create Band/Group Profile";
    }
    return "Create User Profile";
  };

  const handleProfileCreation = () => {
    handleProfileCreated();
  };

  // Render based on current state
  switch (step) {
    case "method-selection":
      if (currentUser) {
        return (
          <GenericStep
            title="Welcome Back"
            description="You're already signed in. Choose how you want to continue."
            header={StartHeader()}
          >
            <div className="flex flex-col gap-4">
              <div>Signed in as: {metadata?.name || currentUser.pubkey.slice(0, 8)}</div>
              <Button onClick={() => navigate("/groups")}>Back to Home</Button>
              <Button onClick={logout}>
                Logout
              </Button>
            </div>
          </GenericStep>
        );
      }
      return (
        <GenericStep
          title="Welcome to Wavlake"
          description="Choose how you want to get started"
          header={StartHeader()}
        >
          {AUTH_METHODS.map((method) => {
            const IconComponent = method.icon;
            const handleClick = method.method === "sign-up" ? handleSelectSignup : handleSelectSignin;

            return (
              <Button
                key={method.method}
                onClick={handleClick}
                variant={method.variant === "primary" ? "default" : "outline"}
                className={`w-full h-auto min-h-[100px] sm:min-h-[80px] py-4 sm:py-4 px-4 sm:px-4 rounded-xl text-left border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  method.variant === "primary"
                    ? "hover:bg-primary/90 active:bg-primary/80"
                    : "hover:bg-muted/50 active:bg-muted/70"
                }`}
                size="lg"
              >
                <div className="flex items-center gap-3 w-full">
                  <IconComponent
                    className={`w-5 h-5 shrink-0 ${
                      method.variant === "primary"
                        ? "text-primary-foreground"
                        : "text-primary"
                    }`}
                  />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-base sm:text-base">
                      {method.title}
                    </div>
                    <div className="text-sm sm:text-sm text-muted-foreground mt-1 leading-tight break-words whitespace-normal">
                      {method.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </GenericStep>
      );

    // Sign-up flow cases (from SignUp.tsx)
    case "sign-up":
      return (
        <TooltipProvider>
          <GenericStep
            handleBack={handleBack}
            title="Sign Up"
            description="Select whether you want to sign up as an artist or a listener. This helps us tailor your experience."
          >
            <div className="space-y-4">
              <Button
                onClick={() => handleSetUserType(true)}
                variant="outline"
                className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors"
                size="lg"
                disabled={isCreating}
              >
                <div className="flex items-center gap-3 w-full">
                  <MicIcon className="w-5 h-5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-base">Artist</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Share your music and connect with fans
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button
                onClick={() => handleSetUserType(false)}
                variant="outline"
                className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors"
                size="lg"
                disabled={isCreating}
              >
                <div className="flex items-center gap-3 w-full">
                  <HeadphonesIcon className="w-5 h-5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="font-medium text-base">Listener</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Discover and support your favorite artists
                    </div>
                  </div>
                </div>
              </Button>
              {isCreating && (
                <div className="text-center text-sm text-muted-foreground">
                  Creating account...
                </div>
              )}
            </div>
          </GenericStep>
        </TooltipProvider>
      );

    case "artist-type":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Artist Type"
          description="Are you a solo artist or part of a band/group?"
        >
          <div className="space-y-4">
            <Button
              onClick={() => handleSetArtistType(true)}
              variant="outline"
              className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors"
              size="lg"
              disabled={isCreating}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-5 h-5 shrink-0 bg-primary rounded-full" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="font-medium text-base">Solo Artist</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    I'm an individual artist
                  </div>
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleSetArtistType(false)}
              variant="outline"
              className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors"
              size="lg"
              disabled={isCreating}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-5 h-5 shrink-0 bg-primary rounded-full" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="font-medium text-base">Band/Group</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    I'm part of a band or group
                  </div>
                </div>
              </div>
            </Button>
            {isCreating && (
              <div className="text-center text-sm text-muted-foreground">
                Creating account...
              </div>
            )}
          </div>
        </GenericStep>
      );

    case "profile-setup":
      return (
        <GenericStep
          handleBack={handleBack}
          title={getProfileTitle()}
          description={getProfileStepDescription()}
        >
          <EditProfileForm
            onComplete={handleProfileCreation}
            showSkipLink={true}
          />
          <Button
            variant="ghost"
            onClick={handleProfileCreated}
            className="w-full"
          >
            Skip for now
          </Button>
        </GenericStep>
      );

    case "firebase-backup":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Add Backup Email"
          description="Add an email to help recover your account if needed. This is optional but recommended for artists."
        >
          <FirebaseAuthForm
            mode="signup"
            onComplete={handleFirebaseBackupComplete}
          />
        </GenericStep>
      );

    // Sign-in flow cases (from SignIn.tsx)
    case "nostr-auth":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Sign In"
          description="Sign in to Wavlake"
        >
          <NostrAuthForm onComplete={handleNostrAuthComplete} />
          <Button
            className="w-full rounded-full py-6"
            onClick={handleSelectLegacyAuth}
          >
            Migrate Legacy Wavlake Account
          </Button>
        </GenericStep>
      );

    case "legacy-auth":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Sign In"
          description="Sign in to Wavlake"
        >
          <FirebaseAuthForm
            mode="signin"
            onComplete={handleLegacyAuthComplete}
          />
        </GenericStep>
      );

    case "account-linking":
      if (isLoadingLegacyArtists) {
        return <div>Loading legacy artists...</div>;
      }
      
      return (
        <GenericStep
          handleBack={handleBack}
          title="Nostr Setup"
          description="Let's create a new Nostr identity for you"
        >
          <NostrAuthForm 
            expectedPubkey={primaryPubkey?.pubkey}
            onComplete={handleAccountLinkingComplete} 
          />
        </GenericStep>
      );

    case "welcome":
      const finalIsArtist = isArtist || isLegacyArtist;
      return (
        <GenericStep
          title="Welcome to Wavlake!"
          description={`You're all set up as ${finalIsArtist ? 'an artist' : 'a listener'}. Let's get started!`}
        >
          <Button
            className="w-full rounded-full py-6"
            onClick={handleWelcomeComplete}
          >
            Continue to Wavlake
          </Button>
        </GenericStep>
      );

    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", step);
      return <div>An unexpected error occurred. Please refresh the page.</div>;
  }
}
