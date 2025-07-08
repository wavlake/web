/**
 * NostrAuthStep - Multi-method Nostr authentication component with auto-linking capabilities
 * 
 * This component provides comprehensive Nostr authentication supporting:
 * - Browser extension authentication (NIP-07) 
 * - Direct private key input (nsec) with secure handling
 * - NIP-46 bunker connections for remote signers and hardware wallets
 * - Automatic linking of authenticated pubkeys to Firebase accounts
 * - Comprehensive error handling and user feedback
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

import React, { useRef, useState } from "react";
import { Shield, Upload, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLoginActions } from "@/hooks/useLoginActions";
import { useProfileSync } from "@/hooks/useProfileSync";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { useToast } from "@/hooks/useToast";
import { useNostr } from "@nostrify/react";
import { NUser } from "@nostrify/react/login";
import type { NLoginType } from "@nostrify/react/login";
import type { NostrAuthStepProps, NostrSigner } from "@/types/auth";

// Comprehensive pubkey validation following Nostr standards
const validatePubkey = (pubkey: string): boolean => {
  if (!pubkey || typeof pubkey !== 'string') return false;
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
  const [bunkerUri, setBunkerUri] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkingStatus, setLinkingStatus] = useState<'idle' | 'linking' | 'success' | 'failed'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { nostr } = useNostr();
  const login = useLoginActions();
  const { syncProfile } = useProfileSync();
  const { autoLink, isLinking } = useAutoLinkPubkey();
  const { toast } = useToast();

  const loginToUser = (loginInfo: NLoginType): { signer: NostrSigner } => {
    switch (loginInfo.type) {
      case 'nsec':
        return NUser.fromNsecLogin(loginInfo);
      case 'bunker':
        return NUser.fromBunkerLogin(loginInfo, nostr);
      case 'extension':
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
   * 
   * Pattern matching strategy:
   * - Rate limiting: Detected by 'rate limit' keywords, suggests waiting
   * - Network issues: Detected by 'network'/'fetch' keywords, suggests connectivity check
   * - Timeouts: Detected by 'timeout' keyword, suggests retry
   * - Input validation: Detected by 'invalid'/'format' keywords, suggests input review
   * - Extension issues: Detected by 'extension'/'nostr' keywords, suggests extension check
   * - Unknown errors: Fallback to generic message to avoid exposing technical details
   * 
   * All error messages are sanitized to prevent sensitive information exposure.
   */
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('rate limit')) {
        return 'Too many attempts. Please wait a moment before trying again.';
      }
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (message.includes('timeout')) {
        return 'Connection timeout. Please try again.';
      }
      if (message.includes('invalid') || message.includes('format')) {
        return 'Invalid input format. Please check your credentials and try again.';
      }
      if (message.includes('extension') || message.includes('nostr')) {
        return 'Extension error. Please ensure your Nostr extension is installed and working.';
      }
      return 'Authentication failed. Please try again.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const validateNsec = (nsec: string): boolean => {
    if (!nsec || !nsec.trim()) return false;
    if (!nsec.startsWith('nsec1')) return false;
    if (nsec.length !== 63) return false;
    // Basic bech32 validation
    const validChars = /^[a-z0-9]+$/;
    return validChars.test(nsec.slice(5));
  };

  const validateBunkerUri = (uri: string): boolean => {
    if (!uri || !uri.trim()) return false;
    if (!uri.startsWith('bunker://')) return false;
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  };

  const handleAutoLink = async (pubkey: string, signer: NostrSigner) => {
    if (!enableAutoLink || !firebaseUser) return;
    
    // Check if pubkey is already linked
    const isAlreadyLinked = linkedPubkeys.some(p => p.pubkey === pubkey);
    if (isAlreadyLinked) return;

    setLinkingStatus('linking');
    try {
      const result = await autoLink(firebaseUser, pubkey, signer);
      setLinkingStatus(result.success ? 'success' : 'failed');
    } catch (error) {
      setLinkingStatus('failed');
      // Log error without sensitive details for debugging
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
        throw new Error(`Please sign in with the account ending in ...${expectedPubkey.slice(-8)}`);
      }

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);

      // Attempt auto-linking if enabled
      if (enableAutoLink && firebaseUser) {
        const user = loginToUser(loginInfo);
        await handleAutoLink(loginInfo.pubkey, user.signer);
      }

      onSuccess(loginInfo);
    } catch (error) {
      // Log minimal error information for debugging without exposing sensitive data
      console.warn("Authentication processing failed");
      setError(getErrorMessage(error));
    }
  };

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!("nostr" in window)) {
        throw new Error("Nostr extension not found. Please install a NIP-07 compatible extension like Alby or nos2x.");
      }

      const loginInfo = await login.extension();
      
      // Additional validation of returned pubkey
      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error("Invalid pubkey received from extension authentication");
      }
      
      await handleLoginSuccess(loginInfo);
    } catch (error) {
      // Log error without sensitive details for debugging
      console.warn("Extension authentication failed");
      setError(getErrorMessage(error));
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyLogin = async () => {
    if (!nsec.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Validate nsec format before processing
      if (!validateNsec(nsec)) {
        throw new Error("Invalid private key format. Must be a valid 63-character nsec1 key.");
      }

      const loginInfo = login.nsec(nsec);
      
      // Additional validation of returned pubkey
      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error("Invalid pubkey received from nsec authentication");
      }
      
      await handleLoginSuccess(loginInfo);
    } catch (error) {
      // Log error without sensitive details for debugging
      console.warn("Private key authentication failed");
      setError(getErrorMessage(error));
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Validate bunker URI format before processing
      if (!validateBunkerUri(bunkerUri)) {
        throw new Error("Invalid bunker URI format. Must be a valid bunker:// URL.");
      }

      const loginInfo = await login.bunker(bunkerUri);
      
      // Additional validation of returned pubkey
      if (!validatePubkey(loginInfo.pubkey)) {
        throw new Error("Invalid pubkey received from bunker authentication");
      }
      
      await handleLoginSuccess(loginInfo);
    } catch (error) {
      // Log error without sensitive details for debugging
      console.warn("Bunker authentication failed");
      setError(getErrorMessage(error));
      setRetryCount(prev => prev + 1);
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
      setNsec(content.trim());
    };
    reader.readAsText(file);
  };

  const getDefaultTab = () => {
    if ("nostr" in window) return "extension";
    return "key";
  };

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
        <DialogDescription className="text-center text-muted-foreground mt-2">
          {expectedPubkey ? (
            <>Please sign in with your account ending in ...{expectedPubkey.slice(-8)}</>
          ) : (
            <>Access your account securely with Nostr{enableAutoLink && firebaseUser ? " (will be linked automatically)" : ""}</>
          )}
        </DialogDescription>
      </DialogHeader>

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

        {linkingStatus === 'success' && (
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
                  onChange={(e) => setNsec(e.target.value)}
                  className="rounded-lg focus-visible:ring-primary"
                  placeholder="nsec1..."
                />
                <div className="text-xs text-muted-foreground">
                  Your private key is never stored and remains secure
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm mb-2 text-muted-foreground">
                  Or upload a key file
                </div>
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
                onClick={handleKeyLogin}
                disabled={isLoading || !validateNsec(nsec)}
              >
                {isLoading ? "Verifying..." : "Login with Private Key"}
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
              disabled={
                isLoading ||
                !validateBunkerUri(bunkerUri)
              }
            >
              {isLoading ? "Connecting..." : "Connect with Bunker"}
            </Button>
          </TabsContent>
        </Tabs>

        {(linkingStatus === 'linking' || isLinking) && (
          <div className="text-center">
            <div className="text-sm text-muted-foreground">
              Linking your account...
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
};

export default NostrAuthStep;