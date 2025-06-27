import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoginDialog from "@/components/auth/LoginDialog";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";
import { EditProfileForm } from "@/components/EditProfileForm";
import { generateFakeName } from "@/lib/utils";
import { useNostrLogin, NLogin } from "@nostrify/react/login";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { generateSecretKey, nip19 } from "nostr-tools";
import { toast } from "@/hooks/useToast";
import { useCreateCashuWallet } from "@/hooks/useCreateCashuWallet";
import { useCreateAccount } from "@/hooks/useCreateAccount";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { Smartphone } from "lucide-react";
import { useCashuStore } from "@/stores/cashuStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { getTokenAmount } from "@/lib/cashu";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { usePWA } from "@/hooks/usePWA";
import { OnboardingContext } from "@/contexts/OnboardingContext";

const Index = () => {
  const { currentUser } = useLoggedInAccounts();
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();
  const { addLogin } = useNostrLogin();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const [newUser, setNewUser] = useState(false);
  const { mutateAsync: createCashuWallet } = useCreateCashuWallet();
  const { createAccount, isCreating } = useCreateAccount();
  const { wallet, isLoading } = useCashuWallet();

  const [generatedName, setGeneratedName] = useState<string | null>(null);
  const cashuStore = useCashuStore();
  const onboardingStore = useOnboardingStore();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice, isLoading: btcPriceLoading } = useBitcoinPrice();
  const [tokenProcessed, setTokenProcessed] = useState(false);
  const { isRunningAsPwa } = usePWA();

  // Memoize store values to prevent unnecessary re-renders
  const storeValues = useMemo(() => ({
    pendingToken: cashuStore.pendingOnboardingToken,
    isTokenClaimed: onboardingStore.isTokenClaimed(),
  }), [cashuStore.pendingOnboardingToken, onboardingStore.tokenClaimed, onboardingStore]);

  // Check for token in URL on mount
  useEffect(() => {
    // Don't process if already processed
    if (tokenProcessed) return;

    // Check if user has already claimed an onboarding token
    if (storeValues.isTokenClaimed) {
      setTokenProcessed(true);
      // Clean up the URL
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const hash = window.location.hash;
    if (hash && hash.includes("token=")) {
      const tokenMatch = hash.match(/token=([^&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];

        // If USD mode and price is still loading, wait
        if (!showSats && btcPriceLoading) {
          return;
        }

        try {
          // Get the token amount
          const amount = getTokenAmount(token);

          // Store the token for later redemption
          cashuStore.setPendingOnboardingToken(token);

          // Clean up the URL
          window.history.replaceState(null, "", window.location.pathname);

          // Format the amount based on user preference
          let displayAmount: string;
          if (showSats) {
            displayAmount = `${amount.toLocaleString()} sats`;
          } else {
            const usd = satsToUSD(amount, btcPrice?.USD || null);
            displayAmount =
              usd !== null ? formatUSD(usd) : `${amount.toLocaleString()} sats`;
          }

          // Show notification with animated icon
          toast({
            title: "✅ Ecash waiting for you!",
            description: `Complete signup to receive ${displayAmount} in your wallet`,
          });

          // Mark as processed
          setTokenProcessed(true);
        } catch (error) {
          console.error("Error processing token:", error);
          setTokenProcessed(true);
        }
      }
    }
  }, [
    storeValues.isTokenClaimed,
    showSats,
    btcPrice,
    btcPriceLoading,
    tokenProcessed,
    cashuStore,
  ]);

  // Redirect to /groups after user is logged in - separate from token processing
  useEffect(() => {
    if (!currentUser || newUser) return;

    if (wallet) {
      console.log("User wallet found:", wallet);
      navigate("/groups", { replace: true });
    } else if (isLoading) {
      console.log("Fetching wallet data...");
    } else {
      console.log("No wallet found for user");
      createCashuWallet()
        .then(() => navigate("/groups", { replace: true }))
        .catch((error) => {
          console.error("Failed to create wallet:", error);
          navigate("/groups", { replace: true });
        });
    }
  }, [currentUser, newUser, wallet, isLoading, navigate, createCashuWallet]);

  // Handle account creation inline
  const handleCreateAccount = async () => {
    setNewUser(true);
    try {
      const result = await createAccount({
        generateName: true,
        createWallet: true,
        onComplete: ({ name }) => {
          // Store the generated name in state immediately
          setGeneratedName(name || null);
          setNewUser(true); // Mark as new user
        },
        onError: (error) => {
          console.error("Account creation failed:", error);
          setNewUser(false);
        }
      });
    } catch (error) {
      console.error("Account creation failed:", error);
      setNewUser(false);
    }
  };

  // Handler for login dialog
  const handleLogin = () => {
    setLoginOpen(false);
  };

  // Onboarding step 1: Not logged in
  if (!currentUser) {
    return (
      <>
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
          <Button
            variant="outline"
            onClick={handleCreateAccount}
            disabled={isCreating}
            className="w-full max-w-[200px] flex items-center justify-center gap-2 mb-6"
          >
            {isCreating ? "Creating..." : "Get Started"}
          </Button>
          <div className="text-sm text-muted-foreground flex items-center justify-center mt-3">
            <span>Have a Nostr/Wavlake account?</span>&nbsp;
            <Button
              variant="link"
              size="sm"
              className="text-primary font-medium hover:underline p-0 h-auto"
              onClick={() => setLoginOpen(true)}
            >
              Sign in
            </Button>
          </div>

          {/* PWA Install Section - Only show if not already running as PWA */}
          {!isRunningAsPwa && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Get the App
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Install Wavlake for the best experience
              </p>
              <PWAInstallButton
                variant="outline"
                size="sm"
                className="w-full max-w-[200px]"
              />
            </div>
          )}
        </div>
        <LoginDialog
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLogin={handleLogin}
        />
      </>
    );
  }

  // Onboarding step 2: New user (just created account) or user without metadata
  if (currentUser && newUser) {
    return (
      <OnboardingContext.Provider value={{ generatedName }}>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background">
          <div className="w-full max-w-lg mx-auto p-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Set your name and pic
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              You can always update them later.
            </p>
            <EditProfileForm showSkipLink={true} initialName={generatedName} />
          </div>
        </div>
      </OnboardingContext.Provider>
    );
  }

  // Fallback (should redirect to /groups in most cases)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div>Loading groups...</div>
    </div>
  );
};

export default Index;
