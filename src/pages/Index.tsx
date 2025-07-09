import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Mail, Key, Loader2 } from "lucide-react";
import { type NLoginType } from "@nostrify/react/login";
import { User as FirebaseUser } from "firebase/auth";
import { FirebaseAuthForm } from "@/components/auth/FirebaseAuthForm";
import { ProfileDiscoveryScreen } from "@/components/auth/ProfileDiscoveryScreen";
import LoginDialog from "@/components/auth/LoginDialog";
import NostrAuthStep from "@/components/auth/NostrAuthStep";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/hooks/useToast";

/**
 * Clean, greenfield login page for Wavlake authentication.
 *
 * This page provides a fresh approach to user authentication with three clear paths:
 * - Get Started: For new users who want to create an account automatically
 * - Wavlake Account: For existing users with email/password accounts
 * - Nostr Account: For users with existing Nostr keys
 */
const Index = () => {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);

  const handleGetStarted = () => {
    console.log("[Index] User starting Get Started flow", {
      component: "Index",
      action: "handleGetStarted",
      navigatingTo: "/create-account",
      source: "onboarding",
    });

    navigate("/create-account", {
      state: {
        source: "onboarding",
        returnPath: "/groups",
      },
    });
  };

  const handleWavlakeAccount = () => {
    setSelectedPath("wavlake-account");
  };

  const handleNostrAccount = () => {
    setIsLoginDialogOpen(true);
  };

  const handleBack = () => {
    setSelectedPath(null);
  };

  const handleFirebaseSuccess = (user: FirebaseUser) => {
    console.log("Firebase authentication successful:", user.uid);
    // Store Firebase user and show profile discovery
    setFirebaseUser(user);
    setSelectedPath("profile-discovery");
  };

  // Profile discovery handlers
  const handleSelectPubkey = (pubkey: string) => {
    console.log("[Index] User selected linked pubkey", {
      component: "Index",
      action: "handleSelectPubkey",
      selectedPubkey: `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`,
      fromPath: "profile-discovery",
      toPath: "nostr-auth-targeted",
      firebaseUser: firebaseUser ? firebaseUser.uid : null,
    });
    setSelectedPubkey(pubkey);
    setSelectedPath("nostr-auth-targeted");
  };

  const handleUseDifferentAccount = () => {
    // Go to open Nostr authentication
    setSelectedPath("nostr-auth-open");
  };

  const handleGenerateNewAccount = () => {
    console.log("[Index] User starting Firebase account generation", {
      component: "Index",
      action: "handleGenerateNewAccount",
      firebaseUser: firebaseUser?.uid,
      navigatingTo: "/create-account",
      source: "firebase-generation",
    });

    navigate("/create-account", {
      state: {
        firebaseUserData: firebaseUser
          ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            }
          : null,
        source: "firebase-generation",
        returnPath: "/groups",
      },
    });
  };

  const handleLoginDialogClose = () => {
    setIsLoginDialogOpen(false);
  };

  const handleLoginDialogSuccess = () => {
    setIsLoginDialogOpen(false);
    navigate("/groups"); // Navigate to groups after successful Nostr login
  };

  // Targeted Nostr authentication handlers
  const handleTargetedAuthSuccess = (login: NLoginType) => {
    console.log("[Index] Targeted auth successful", {
      component: "Index",
      action: "handleTargetedAuthSuccess",
      pubkey: `${login.pubkey.slice(0, 8)}...${login.pubkey.slice(-8)}`,
      loginType: login.type,
      loginId: login.id,
      selectedPubkey: selectedPubkey
        ? `${selectedPubkey.slice(0, 8)}...${selectedPubkey.slice(-8)}`
        : null,
      navigatingTo: "/groups",
    });
    navigate("/groups");
  };

  const handleTargetedAuthBack = () => {
    console.log("[Index] User navigating back from targeted auth", {
      component: "Index",
      action: "handleTargetedAuthBack",
      fromPath: "nostr-auth-targeted",
      toPath: "profile-discovery",
      selectedPubkey: selectedPubkey
        ? `${selectedPubkey.slice(0, 8)}...${selectedPubkey.slice(-8)}`
        : null,
    });
    setSelectedPath("profile-discovery");
    setSelectedPubkey(null);
  };

  // Open Nostr authentication handlers (for "Use different account" flow)
  const handleOpenAuthSuccess = (login: NLoginType) => {
    console.log("[Index] Open auth successful", {
      component: "Index",
      action: "handleOpenAuthSuccess",
      pubkey: `${login.pubkey.slice(0, 8)}...${login.pubkey.slice(-8)}`,
      loginType: login.type,
      loginId: login.id,
      firebaseUser: firebaseUser ? firebaseUser.uid : null,
      navigatingTo: "/groups",
    });
    navigate("/groups");
  };

  const handleOpenAuthBack = () => {
    console.log("[Index] User navigating back from open auth", {
      component: "Index",
      action: "handleOpenAuthBack",
      fromPath: "nostr-auth-open",
      toPath: "profile-discovery",
      firebaseUser: firebaseUser ? firebaseUser.uid : null,
    });
    setSelectedPath("profile-discovery");
  };

  // Show profile discovery after Firebase authentication
  if (selectedPath === "profile-discovery" && firebaseUser) {
    return (
      <ProfileDiscoveryScreen
        firebaseUser={firebaseUser}
        onBack={handleBack}
        onSelectPubkey={handleSelectPubkey}
        onUseDifferentAccount={handleUseDifferentAccount}
        onGenerateNewAccount={handleGenerateNewAccount}
      />
    );
  }

  // Show targeted Nostr authentication for selected pubkey
  if (
    selectedPath === "nostr-auth-targeted" &&
    firebaseUser &&
    selectedPubkey
  ) {
    return (
      <Dialog open={true} onOpenChange={handleTargetedAuthBack}>
        <NostrAuthStep
          firebaseUser={firebaseUser}
          linkedPubkeys={[]}
          expectedPubkey={selectedPubkey}
          onSuccess={handleTargetedAuthSuccess}
          onBack={handleTargetedAuthBack}
          enableAutoLink={true}
        />
      </Dialog>
    );
  }

  // Show open Nostr authentication (for "Use different account" flow)
  if (selectedPath === "nostr-auth-open" && firebaseUser) {
    return (
      <Dialog open={true} onOpenChange={handleOpenAuthBack}>
        <NostrAuthStep
          firebaseUser={firebaseUser}
          linkedPubkeys={[]}
          expectedPubkey={undefined}
          onSuccess={handleOpenAuthSuccess}
          onBack={handleOpenAuthBack}
          enableAutoLink={true}
        />
      </Dialog>
    );
  }

  // Show Wavlake account authentication
  if (selectedPath === "wavlake-account") {
    return (
      <FirebaseAuthForm
        onSuccess={handleFirebaseSuccess}
        onBack={handleBack}
        title="Sign in to Wavlake"
        description="Use your existing email and password"
      />
    );
  }

  // Main login choice screen
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile-optimized layout */}
      <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-8">
        {/* Header - more compact on mobile */}
        <div className="w-full max-w-xs sm:max-w-md mx-auto text-center mb-6 sm:mb-8 px-4 sm:px-0">
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

        {/* Authentication Options - wider on mobile */}
        <div className="w-full max-w-xs sm:max-w-md mx-auto px-4 sm:px-0">
          <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
            <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-center text-lg sm:text-xl">Welcome to Wavlake</CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                Choose how you'd like to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            {/* Get Started Button */}
            <Button
              onClick={handleGetStarted}
              variant="outline"
              className="w-full h-auto py-4 sm:py-4 px-4 sm:px-4 rounded-xl text-left border-2 hover:bg-muted/50 active:bg-muted/70 transition-colors"
              size="lg"
            >
              <div className="flex items-center gap-3 w-full">
                <Sparkles className="w-5 h-5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base sm:text-base">Get Started</div>
                  <div className="text-sm sm:text-sm text-muted-foreground mt-1 leading-tight break-words">
                    New to Wavlake? We'll create an account for you
                  </div>
                </div>
              </div>
            </Button>

            {/* Wavlake Account Button */}
            <Button
              onClick={handleWavlakeAccount}
              variant="outline"
              className="w-full h-auto py-4 sm:py-4 px-4 sm:px-4 rounded-xl text-left border-2 hover:bg-muted/50 active:bg-muted/70 transition-colors"
              size="lg"
            >
              <div className="flex items-center gap-3 w-full">
                <Mail className="w-5 h-5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base sm:text-base break-words">I have a Wavlake account</div>
                  <div className="text-sm sm:text-sm text-muted-foreground mt-1 leading-tight break-words">
                    Sign in with your existing email address
                  </div>
                </div>
              </div>
            </Button>

            {/* Nostr Account Button */}
            <Button
              onClick={handleNostrAccount}
              variant="outline"
              className="w-full h-auto py-4 sm:py-4 px-4 sm:px-4 rounded-xl text-left border-2 hover:bg-muted/50 active:bg-muted/70 transition-colors"
              size="lg"
            >
              <div className="flex items-center gap-3 w-full">
                <Key className="w-5 h-5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base sm:text-base break-words">I have a Nostr account</div>
                  <div className="text-sm sm:text-sm text-muted-foreground mt-1 leading-tight break-words">
                    Sign in with your existing Nostr keys
                  </div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Login Dialog */}
      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={handleLoginDialogClose}
        onLogin={handleLoginDialogSuccess}
      />
      </div>
    </div>
  );
};

export default Index;
