/**
 * NostrAuthStep - Multi-method Nostr authentication component with auto-linking capabilities
 *
 * This component provides comprehensive Nostr authentication supporting:
 * - Browser extension authentication (NIP-07)
 * - Direct private key input (nsec) with secure handling
 * - NIP-46 bunker connections for remote signers and hardware wallets
 * - Automatic linking of authenticated pubkeys to Firebase accounts
 * - Comprehensive error handling and user feedback
 * - Profile selection for users with multiple linked accounts
 *
 * Security features:
 * - Private keys are never stored or persisted
 * - Input validation for all authentication methods
 * - Sanitized error messages to prevent information leakage
 * - Proper Nostr cryptographic standards compliance
 *
 * Integration:
 * - Designed for use within CompositeLoginDialog architecture
 * - Compatible with existing Firebase authentication system
 * - Emits proper events for parent component handling
 * - Supports conditional auto-linking based on Firebase user presence
 */

import React, { useRef, useState, useCallback } from "react";
import {
  Shield,
  Upload,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { type NLoginType } from "@nostrify/react/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLoginActions } from "@/hooks/useLoginActions";
import { useProfileSync } from "@/hooks/useProfileSync";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { useToast } from "@/hooks/useToast";
import { useNostr } from "@nostrify/react";
import { useAuthor } from "@/hooks/useAuthor";
import { PubkeyMismatchAlert } from "./PubkeyMismatchAlert";
import { NUser } from "@nostrify/react/login";
import LoginDialog from "./LoginDialog";
import { logAuthError, logAuthInfo } from "@/lib/authLogger";
import { truncatePubkey, getDisplayName } from "@/lib/pubkeyUtils";
import { FirebaseUser } from "@/types/auth";
import { getPublicKey } from "nostr-tools";
import { decode } from "nostr-tools/nip19";

interface NostrAuthStepProps {
  firebaseUser?: FirebaseUser;
  linkedPubkeys?: Array<{
    pubkey: string;
    profile?: {
      name?: string;
      display_name?: string;
      picture?: string;
      about?: string;
    };
  }>;
  expectedPubkey?: string;
  onSuccess: (login: NLoginType) => void;
  onBack: () => void;
  enableAutoLink?: boolean;
}

type AuthMode = "select" | "auth" | "manual";
type NostrSigner =
  | ReturnType<typeof NUser.fromNsecLogin>["signer"]
  | ReturnType<typeof NUser.fromBunkerLogin>["signer"]
  | ReturnType<typeof NUser.fromExtensionLogin>["signer"];

// Comprehensive pubkey validation following Nostr standards
const validatePubkey = (pubkey: string): boolean => {
  if (!pubkey || typeof pubkey !== "string") return false;
  if (pubkey.length !== 64) return false;
  return /^[a-f0-9]{64}$/i.test(pubkey);
};

export const NostrAuthStep: React.FC<NostrAuthStepProps> = ({
  firebaseUser,
  linkedPubkeys = [],
  expectedPubkey,
  onSuccess,
  onBack,
  enableAutoLink = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState("");
  const [nsecMismatch, setNsecMismatch] = useState<{
    expectedPubkey: string;
    enteredPubkey: string;
  } | null>(null);
  const [bunkerUri, setBunkerUri] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkingStatus, setLinkingStatus] = useState<
    "idle" | "linking" | "success" | "failed"
  >("idle");
  const [retryCount, setRetryCount] = useState(0);
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("select");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [mismatchData, setMismatchData] = useState<{
    expectedPubkey: string;
    enteredPubkey: string;
    loginInfo: NLoginType;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { nostr } = useNostr();
  const login = useLoginActions();
  const { syncProfile } = useProfileSync();
  const { autoLink, isLinking } = useAutoLinkPubkey();
  const { toast } = useToast();

  // Fetch profile data for the expected pubkey
  const expectedProfile = useAuthor(expectedPubkey);

  const loginToUser = (loginInfo: NLoginType): { signer: NostrSigner } => {
    switch (loginInfo.type) {
      case "nsec":
        return NUser.fromNsecLogin(loginInfo);
      case "bunker":
        return NUser.fromBunkerLogin(loginInfo, nostr);
      case "extension":
        return NUser.fromExtensionLogin(loginInfo);
      default:
        throw new Error(`Unsupported login type: ${loginInfo.type}`);
    }
  };

  const clearError = () => {
    setError(null);
    setRetryCount(0);
  };

  /**
   * Converts technical error messages into user-friendly, actionable feedback.
   */
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("rate limit")) {
        return "Too many attempts. Please wait a moment before trying again.";
      }
      if (message.includes("network") || message.includes("fetch")) {
        return "Network error. Please check your connection and try again.";
      }
      if (message.includes("timeout")) {
        return "Connection timeout. Please try again.";
      }
      if (message.includes("invalid") || message.includes("format")) {
        return "Invalid input format. Please check your credentials and try again.";
      }
      if (message.includes("extension") || message.includes("nostr")) {
        return "Extension error. Please ensure your Nostr extension is installed and working.";
      }
      return "Authentication failed. Please try again.";
    }
    return "An unexpected error occurred. Please try again.";
  };

  const validateNsec = (nsec: string): boolean => {
    if (!nsec || !nsec.trim()) return false;
    if (!nsec.startsWith("nsec1")) return false;
    if (nsec.length !== 63) return false;
    // Basic bech32 validation
    const validChars = /^[a-z0-9]+$/;
    return validChars.test(nsec.slice(5));
  };

  const validateBunkerUri = (uri: string): boolean => {
    if (!uri || !uri.trim()) return false;
    if (!uri.startsWith("bunker://")) return false;
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  };

  const checkNsecMismatch = (nsecValue: string) => {
    // Clear existing mismatch if nsec is empty or invalid
    if (!nsecValue || !validateNsec(nsecValue) || !expectedPubkey) {
      setNsecMismatch(null);
      return;
    }

    try {
      // Extract pubkey from nsec without performing login
      // This uses nostr-tools to decode the nsec and get the pubkey
      const { data } = decode(nsecValue);
      const enteredPubkey = getPublicKey(data as Uint8Array);

      // Check for mismatch
      if (enteredPubkey !== expectedPubkey) {
        setNsecMismatch({
          expectedPubkey,
          enteredPubkey,
        });
      } else {
        setNsecMismatch(null);
      }
    } catch (error) {
      // If there's an error decoding the nsec, clear the mismatch
      setNsecMismatch(null);
    }
  };

  const handleAutoLink = async (pubkey: string, signer: NostrSigner) => {
    if (!enableAutoLink || !firebaseUser) return;

    // Check if pubkey is already linked
    const isAlreadyLinked = linkedPubkeys.some((p) => p.pubkey === pubkey);
    if (isAlreadyLinked) return;

    setLinkingStatus("linking");
    try {
      const result = await autoLink(firebaseUser, pubkey);
      setLinkingStatus(result.success ? "success" : "failed");
    } catch (error) {
      setLinkingStatus("failed");
      console.warn("Auto-linking failed");
    }
  };

  const handleLoginSuccess = async (loginInfo: NLoginType) => {

    try {
      // Validate pubkey format
      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error("Invalid pubkey format received from authentication");
      }

      // Validate expected pubkey if provided
      if (expectedPubkey && loginInfo.pubkey !== expectedPubkey) {
        console.error("[NostrAuthStep] Pubkey mismatch", {
          expected: expectedPubkey,
          received: loginInfo.pubkey,
          currentMode: mode,
          showLoginDialog,
          hasLinkedPubkeys: linkedPubkeys.length > 0,
        });
        // Show mismatch alert instead of throwing error
        setMismatchData({
          expectedPubkey: expectedPubkey,
          enteredPubkey: loginInfo.pubkey,
          loginInfo: loginInfo,
        });
        setIsLoading(false);
        return;
      }


      // Log the authentication attempt
      logAuthInfo(
        "nostr-auth-step-start",
        firebaseUser,
        loginInfo.pubkey,
        linkedPubkeys.length
      );

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);

      // Attempt auto-linking if enabled
      if (enableAutoLink && firebaseUser) {
        const user = loginToUser(loginInfo);
        await handleAutoLink(loginInfo.pubkey, user.signer);
      }

      logAuthInfo("nostr-auth-step-success", firebaseUser, loginInfo.pubkey);
      onSuccess(loginInfo);
    } catch (error) {
      console.error("[NostrAuthStep] Authentication processing failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        pubkey: `${loginInfo.pubkey.slice(0, 8)}...${loginInfo.pubkey.slice(
          -8
        )}`,
      });
      logAuthError(
        "nostr-auth-step",
        error,
        firebaseUser,
        loginInfo.pubkey,
        linkedPubkeys.length
      );
      setError(getErrorMessage(error));
    }
  };

  const handleNostrLoginSuccess = async () => {
    try {
      // Create a placeholder login object for the LoginDialog flow
      const placeholderLogin: NLoginType = {
        id: "placeholder-" + Date.now(),
        type: "extension" as const,
        pubkey: selectedPubkey || "placeholder-pubkey",
        createdAt: new Date().toISOString(),
        data: null,
      };

      await handleLoginSuccess(placeholderLogin);
    } catch (error) {
      logAuthError(
        "nostr-auth-step",
        error,
        firebaseUser,
        selectedPubkey || undefined,
        linkedPubkeys.length
      );

      // Continue with sign-in even if linking fails
      const placeholderLogin: NLoginType = {
        id: "placeholder-" + Date.now(),
        type: "extension" as const,
        pubkey: selectedPubkey || "placeholder-pubkey",
        createdAt: new Date().toISOString(),
        data: null,
      };
      onSuccess(placeholderLogin);
    }
  };

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!("nostr" in window)) {
        throw new Error(
          "Nostr extension not found. Please install a NIP-07 compatible extension like Alby or nos2x."
        );
      }

      const loginInfo = await login.extension();

      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error(
          "Invalid pubkey received from extension authentication"
        );
      }

      await handleLoginSuccess(loginInfo);
    } catch (error) {
      console.warn("Extension authentication failed");
      setError(getErrorMessage(error));
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyLogin = async () => {

    if (!nsec.trim()) {
      console.warn("[NostrAuthStep] No nsec provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!validateNsec(nsec)) {
        throw new Error(
          "Invalid private key format. Must be a valid 63-character nsec1 key."
        );
      }

      const loginInfo = login.nsec(nsec);

      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error("Invalid pubkey received from nsec authentication");
      }

      await handleLoginSuccess(loginInfo);
    } catch (error) {
      console.error("[NostrAuthStep] Private key authentication failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setError(getErrorMessage(error));
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!validateBunkerUri(bunkerUri)) {
        throw new Error(
          "Invalid bunker URI format. Must be a valid bunker:// URL."
        );
      }

      const loginInfo = await login.bunker(bunkerUri);

      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error("Invalid pubkey received from bunker authentication");
      }

      await handleLoginSuccess(loginInfo);
    } catch (error) {
      console.warn("Bunker authentication failed");
      setError(getErrorMessage(error));
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const trimmedContent = content.trim();
      setNsec(trimmedContent);
      checkNsecMismatch(trimmedContent);
    };
    reader.readAsText(file);
  };

  /**
   * Handles the "Generate New Account" flow for new users
   */
  const handleCreateNewAccount = async () => {
    setShowLoginDialog(true);
  };

  // Event handlers
  const handleCloseLoginDialog = () => setShowLoginDialog(false);
  const handleSelectMode = () => setMode("select");
  const handleMismatchProceed = async () => {
    // Handle both real-time nsec mismatch and post-login mismatch
    if (nsecMismatch) {
      // For real-time mismatch, proceed with the login
      setNsecMismatch(null);
      await handleKeyLogin();
      return;
    }

    if (!mismatchData) return;

    // Clear mismatch state and proceed with the entered account
    const { loginInfo } = mismatchData;
    setMismatchData(null);

    // Continue with the original login flow but skip pubkey validation
    try {
      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      // Attempt auto-linking if enabled
      if (enableAutoLink && firebaseUser) {
        const user = loginToUser(loginInfo);
        await handleAutoLink(loginInfo.pubkey, user.signer);
      }
      // Complete the login
      onSuccess(loginInfo);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
      setIsLoading(false);
    }
  };

  const handleBackFromLogin = useCallback(() => {
    setShowLoginDialog(false);
    if (linkedPubkeys.length > 0) {
      setMode("select");
    } else {
      onBack();
    }
  }, [linkedPubkeys.length, onBack]);

  const createAccountClickHandler = useCallback(
    (pubkey: string) => () => {
      setSelectedPubkey(pubkey);
      setShowLoginDialog(true);
    },
    []
  );

  const getDefaultTab = () => {
    if ("nostr" in window) return "extension";
    return "key";
  };

  // Show profile selection if we have linked pubkeys and haven't selected one yet
  if (mode === "select" && linkedPubkeys.length > 0) {
    return (
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Your Account</DialogTitle>
          <DialogDescription>
            We found {linkedPubkeys.length} Nostr account(s) linked to your
            email
          </DialogDescription>
        </DialogHeader>

        {/* Show mismatch alert if detected */}
        {mismatchData && (
          <div className="px-6 pt-4">
            <PubkeyMismatchAlert
              expectedPubkey={mismatchData.expectedPubkey}
              enteredPubkey={mismatchData.enteredPubkey}
            />
          </div>
        )}

        <div className="space-y-3">
          {linkedPubkeys.map((account) => (
            <div
              key={account.pubkey}
              className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={createAccountClickHandler(account.pubkey)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  {getDisplayName(account.profile)?.[0] ||
                    account.pubkey.slice(0, 2)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">
                    {getDisplayName(account.profile)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {truncatePubkey(account.pubkey)}
                  </p>
                </div>
                <div className="text-muted-foreground">→</div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => setMode("manual")}
            variant="outline"
            className="w-full"
          >
            Use Different Nostr Account
          </Button>
          {firebaseUser && (
            <Button
              onClick={handleCreateNewAccount}
              variant="outline"
              className="w-full"
            >
              Generate New Account
            </Button>
          )}
          <Button onClick={onBack} variant="ghost" className="w-full">
            Back
          </Button>
        </div>
      </DialogContent>
    );
  }

  // Show the standard Nostr login dialog for simple cases
  if (showLoginDialog) {
    return (
      <div className="relative">
        <LoginDialog
          isOpen={true}
          onClose={handleCloseLoginDialog}
          onLogin={handleNostrLoginSuccess}
        />

        {/* Mismatch alert overlay */}
        {mismatchData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
              <PubkeyMismatchAlert
                expectedPubkey={mismatchData.expectedPubkey}
                enteredPubkey={mismatchData.enteredPubkey}
              />
            </div>
          </div>
        )}

        {/* Back button overlay */}
        <div className="fixed bottom-4 left-4 z-50">
          <Button onClick={handleBackFromLogin} variant="outline" size="sm">
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  // Manual authentication with full UI controls
  if (mode === "manual" || linkedPubkeys.length === 0) {
    return (
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-0 relative">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-semibold">
              Sign in with Nostr
            </DialogTitle>
            <div className="w-8" /> {/* Spacer for centering */}
          </div>
          {expectedPubkey && expectedProfile?.data ? (
            <div className="flex items-center mt-4 space-x-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={expectedProfile.data?.metadata?.picture} />
                <AvatarFallback className="text-sm">
                  {expectedProfile.data?.metadata?.name?.[0]?.toUpperCase() ||
                    expectedProfile.data?.metadata?.display_name?.[0]?.toUpperCase() ||
                    expectedPubkey.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {expectedProfile.data?.metadata?.name ||
                expectedProfile.data?.metadata?.display_name ? (
                  <>
                    <div className="font-medium text-foreground truncate">
                      {expectedProfile.data.metadata.name ||
                        expectedProfile.data.metadata.display_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Please sign in with your account ending in ...
                      {expectedPubkey.slice(-8)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Please sign in with your account ending in ...
                    {expectedPubkey.slice(-8)}
                  </div>
                )}
              </div>
            </div>
          ) : expectedPubkey && expectedProfile?.isLoading ? (
            <div className="flex flex-col items-center mt-4 space-y-3">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {expectedPubkey.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">
                  Loading profile...
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Please sign in with your account ending in ...
                  {expectedPubkey.slice(-8)}
                </div>
              </div>
            </div>
          ) : expectedPubkey ? (
            <DialogDescription className="text-center text-muted-foreground mt-2">
              Please sign in with your account ending in ...
              {expectedPubkey.slice(-8)}
            </DialogDescription>
          ) : (
            <DialogDescription className="text-center text-muted-foreground mt-2">
              Access your account securely with Nostr
              {enableAutoLink && firebaseUser
                ? " (will be linked automatically)"
                : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        {mismatchData && (
          <div className="px-6 pt-4">
            <PubkeyMismatchAlert
              expectedPubkey={mismatchData.expectedPubkey}
              enteredPubkey={mismatchData.enteredPubkey}
            />
          </div>
        )}

        <div className="px-6 py-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearError}
                  className="ml-2 h-6 px-2"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {linkingStatus === "success" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Account successfully linked to your Wavlake account!
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={getDefaultTab()} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="extension">Extension</TabsTrigger>
              <TabsTrigger value="key">Nsec</TabsTrigger>
              <TabsTrigger value="bunker">Bunker</TabsTrigger>
            </TabsList>

            <TabsContent value="extension" className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
                <div className="text-sm text-muted-foreground mb-4">
                  One-click login using your browser extension
                </div>
                <Button
                  className="w-full rounded-full py-6"
                  onClick={handleExtensionLogin}
                  disabled={isLoading}
                >
                  {isLoading ? "Connecting..." : "Login with Extension"}
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  Supports Alby, nos2x, and other NIP-07 extensions
                </div>
              </div>
            </TabsContent>

            <TabsContent value="key" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="nsec"
                    className="text-sm font-medium text-foreground"
                  >
                    Enter your private key (nsec)
                  </label>
                  <Input
                    id="nsec"
                    type="password"
                    value={nsec}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNsec(value);
                      checkNsecMismatch(value);
                    }}
                    className="rounded-lg focus-visible:ring-primary"
                    placeholder="nsec1..."
                  />
                  <div className="text-xs text-muted-foreground">
                    Your private key is never stored and remains secure
                  </div>

                  {/* Real-time mismatch alert */}
                  {nsecMismatch && (
                    <div className="mt-2">
                      <PubkeyMismatchAlert
                        expectedPubkey={nsecMismatch.expectedPubkey}
                        enteredPubkey={nsecMismatch.enteredPubkey}
                      />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <input
                    type="file"
                    accept=".txt,.key"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Private Key File
                  </Button>
                </div>

                <Button
                  className="w-full rounded-full py-6 mt-4"
                  onClick={
                    nsecMismatch ? handleMismatchProceed : handleKeyLogin
                  }
                  disabled={isLoading || !validateNsec(nsec)}
                >
                  {isLoading
                    ? "Verifying..."
                    : nsecMismatch
                    ? "Proceed with This Account"
                    : "Login with Private Key"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bunker" className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="bunkerUri"
                  className="text-sm font-medium text-foreground"
                >
                  Bunker URI (NIP-46)
                </label>
                <Input
                  id="bunkerUri"
                  value={bunkerUri}
                  onChange={(e) => setBunkerUri(e.target.value)}
                  className="rounded-lg focus-visible:ring-primary"
                  placeholder="bunker://..."
                />
                {bunkerUri && !validateBunkerUri(bunkerUri) && (
                  <div className="text-destructive text-xs">
                    Invalid bunker URI format. Must be a valid bunker:// URL.
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Connect to remote signers and hardware wallets
                </div>
              </div>

              <Button
                className="w-full rounded-full py-6"
                onClick={handleBunkerLogin}
                disabled={isLoading || !validateBunkerUri(bunkerUri)}
              >
                {isLoading ? "Connecting..." : "Connect with Bunker"}
              </Button>
            </TabsContent>
          </Tabs>

          {(linkingStatus === "linking" || isLinking) && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Linking your account...
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    );
  }

  // Default state - show simple Nostr authentication options
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Sign in with Nostr</DialogTitle>
        <DialogDescription>
          {selectedPubkey
            ? `Please sign in with your account ending in ...${selectedPubkey.slice(
                -8
              )}`
            : firebaseUser
            ? "Sign in with any Nostr account. This will be linked to your Wavlake account."
            : "Choose how you'd like to authenticate with Nostr."}
        </DialogDescription>
      </DialogHeader>

      {/* Show mismatch alert if detected */}
      {mismatchData && (
        <div className="px-6 pt-4">
          <PubkeyMismatchAlert
            expectedPubkey={mismatchData.expectedPubkey}
            enteredPubkey={mismatchData.enteredPubkey}
          />
        </div>
      )}

      <div className="space-y-4">
        <Button onClick={() => setMode("manual")} className="w-full" size="lg">
          Continue with Nostr
        </Button>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          {linkedPubkeys.length > 0 && (
            <Button variant="outline" onClick={handleSelectMode}>
              Choose Account
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default NostrAuthStep;
