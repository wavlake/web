import { useState } from "react";
import { SignIn } from "@/components/auth/v3/SignIn";
import { SignUp } from "@/components/auth/v3/SignUp";
import { Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenericStep } from "@/components/auth/v3/GenericStep";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";
import { useNavigate } from "react-router-dom";

type AUTH_STEP = "method-selection" | "sign-up" | "sign-in";

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

  const { currentUser, removeLogin } = useLoggedInAccounts();
  const [STATE, SET_STATE] = useState<AUTH_STEP>("method-selection");

  const handleBack = () => {
    SET_STATE("method-selection");
  };

  // Render based on current state
  switch (STATE) {
    case "method-selection":
      if (currentUser) {
        return (
          <GenericStep
            title="Welcome Back"
            description="You're already signed in. Choose how you want to continue."
            header={StartHeader()}
          >
            <div className="flex flex-col gap-4">
              <div>Signed in as: {currentUser.metadata.name}</div>
              <Button onClick={() => navigate("/groups")}>Back to Home</Button>
              <Button onClick={() => removeLogin(currentUser.id)}>
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
      return <SignIn handleBack={handleBack} />;

    case "sign-up":
      return <SignUp handleBack={handleBack} />;

    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", STATE);
      return <div>An unexpected error occurred. Please refresh the page.</div>;
  }
}
