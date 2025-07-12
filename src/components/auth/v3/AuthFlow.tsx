import { useAuthFlow } from "@/hooks/auth/useAuthFlow";
import { useNostrAuthentication } from "@/hooks/auth/useNostrAuthentication";
import { useFirebaseAuthentication } from "@/hooks/auth/useFirebaseAuthentication";
import { useAccountLinking } from "@/hooks/auth/useAccountLinking";
import { useProfileSync } from "@/hooks/useProfileSync";
import { useNostrLogin } from "@nostrify/react/login";
import type { NLoginType } from "@nostrify/react/login";
import type { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
import { useState } from "react";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericStep } from "./GenericStep";

type AUTH_STEP = "method-selection" | "sign-up" | "sign-in";
/**
 * Convert NLoginType to AuthenticatedUser for state machine
 */
function convertToAuthenticatedUser(login: NLoginType) {
  return {
    pubkey: login.pubkey,
    signer: login, // Will be processed by useCurrentUser
    // Profile will be fetched by useCurrentUser
  };
}

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
export function AuthFlow() {
  const [STATE, SET_STATE] = useState<AUTH_STEP>("method-selection");
  const { state, context, send } = useAuthFlow();
  const { syncProfile } = useProfileSync();
  const { addLogin } = useNostrLogin();

  // Business logic hooks
  const nostrAuth = useNostrAuthentication();
  const firebaseAuth = useFirebaseAuthentication();

  const accountLinking = useAccountLinking();

  // Handle Nostr authentication
  const handleNostrAuth = async (
    method: NostrAuthMethod,
    credentials: NostrCredentials
  ) => {
    try {
      const login = await nostrAuth.authenticate(method, credentials);

      // CRITICAL: Register the login with useNostrLogin so useCurrentUser() can find it
      addLogin(login);

      // Sync profile after successful login
      await syncProfile(login.pubkey);
      // If we have a Firebase user context, we're doing targeted auth
      if (context.firebaseUser) {
        // Now link the account (useCurrentUser() will find the authenticated user)
        await accountLinking.linkAccount(context.firebaseUser, login.pubkey);

        // Complete the flow
        const user = convertToAuthenticatedUser(login);
        send({ type: "LINKING_COMPLETE", user });
      } else {
        // Direct Nostr auth - complete immediately
        send({ type: "NOSTR_SUCCESS", login });
      }
    } catch (error) {
      console.error("Nostr authentication failed:", error);
      send({
        type: "ERROR",
        error: error instanceof Error ? error.message : "Authentication failed",
      });
    }
  };

  // Handle Firebase authentication
  const handleFirebaseAuth = async (
    email: string,
    password: string,
    isSignUp: boolean
  ) => {
    try {
      const result = isSignUp
        ? await firebaseAuth.signUp(email, password)
        : await firebaseAuth.signIn(email, password);

      send({
        type: "FIREBASE_SUCCESS",
        user: result.user,
        isNewUser: result.isNewUser,
      });
    } catch (error) {
      console.error("Firebase authentication failed:", error);
      send({
        type: "ERROR",
        error: error instanceof Error ? error.message : "Authentication failed",
      });
    }
  };

  // Handle account selection
  const handleAccountSelection = (pubkey: string) => {
    send({ type: "ACCOUNT_SELECTED", pubkey });
  };

  // Handle different account flow
  const handleUseDifferentAccount = () => {
    send({ type: "USE_DIFFERENT_ACCOUNT" });
  };

  // Handle generate new account
  const handleGenerateNewAccount = () => {
    send({ type: "GENERATE_NEW_ACCOUNT" });
  };

  const handleBack = () => {
    SET_STATE("method-selection");
  };

  // Render based on current state
  switch (STATE) {
    case "method-selection":
      return (
        <GenericStep
          title="Welcome to Wavlake"
          description="Choose how you want to get started"
          header={StartHeader()}
        >
          {AUTH_METHODS.map((method) => {
            const IconComponent = method.icon;

            return (
              <Button
                key={method.method}
                onClick={() => SET_STATE(method.method)}
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

    case "sign-in":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Sign In"
          description="Sign in to your Wavlake account"
        >
          <SignIn handleBack={handleBack} />
        </GenericStep>
      );

    case "sign-up":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Sign In"
          description="Sign in to your Wavlake account"
        >
          <SignUp handleBack={handleBack} />
        </GenericStep>
      );

    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", state);
      return <div>An unexpected error occurred. Please try again.</div>;
  }
}

export default AuthFlow;
