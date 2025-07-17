/**
 * Linked Nostr Auth Step
 * 
 * Handles authentication when the user has linked Nostr accounts.
 * Shows the expected account and provides Nostr auth options.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Zap, Link2, User, CheckCircle, Shield, AlertCircle } from "lucide-react";
import { LinkedPubkey } from "@/hooks/auth/machines/types";

// ============================================================================
// Types
// ============================================================================

interface LinkedNostrAuthStepProps {
  expectedPubkey: string | null;
  linkedPubkeys: LinkedPubkey[];
  onComplete: (credentials: NostrCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onBack?: () => void;
  onUseDifferentAccount?: () => void;
}

type NostrAuthMethod = "extension" | "nsec" | "bunker";

interface NostrCredentials {
  method: NostrAuthMethod;
  nsec?: string;
  bunkerUri?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPubkey(pubkey: string): string {
  if (pubkey.length <= 16) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "Unknown";
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return "Just now";
}

// ============================================================================
// Component
// ============================================================================

export function LinkedNostrAuthStep({
  expectedPubkey,
  linkedPubkeys,
  onComplete,
  isLoading,
  error,
  onBack,
  onUseDifferentAccount,
}: LinkedNostrAuthStepProps) {
  const [nsecInput, setNsecInput] = useState("");
  const [bunkerInput, setBunkerInput] = useState("");

  // Find the expected account info
  const expectedAccount = expectedPubkey ? linkedPubkeys.find(p => p.pubkey === expectedPubkey) : null;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleExtensionAuth = async () => {
    await onComplete({ method: "extension" });
  };

  const handleNsecAuth = async () => {
    if (!nsecInput.trim()) return;
    await onComplete({ method: "nsec", nsec: nsecInput.trim() });
  };

  const handleBunkerAuth = async () => {
    if (!bunkerInput.trim()) return;
    await onComplete({ method: "bunker", bunkerUri: bunkerInput.trim() });
  };

  // Validation helpers
  const isNsecValid = nsecInput.trim().length > 0 && nsecInput.startsWith("nsec1");
  const isBunkerValid = bunkerInput.trim().length > 0 && bunkerInput.startsWith("bunker://");

  // ============================================================================
  // Render Tabbed Authentication (matching NostrAuthForm.tsx)
  // ============================================================================

  const renderAuthTabs = () => (
    <Tabs defaultValue="extension" className="w-full">
      <TabsList className="grid grid-cols-3 mb-6">
        <TabsTrigger value="extension">Extension</TabsTrigger>
        <TabsTrigger value="nsec">Nsec</TabsTrigger>
        <TabsTrigger value="bunker">Bunker</TabsTrigger>
      </TabsList>

      <TabsContent value="extension" className="space-y-4">
        <div className="text-center p-4 rounded-lg bg-muted">
          <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
          <div className="text-sm text-muted-foreground mb-4">
            Login with one click using the browser extension
          </div>
          {expectedPubkey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure your extension contains the account ending in {formatPubkey(expectedPubkey)}.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <Button
          className="w-full rounded-full py-6"
          onClick={handleExtensionAuth}
          disabled={isLoading}
        >
          {isLoading ? "Authenticating..." : "Login with Extension"}
        </Button>
      </TabsContent>

      <TabsContent value="nsec" className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nsec">Enter your nsec</Label>
            <Input
              id="nsec"
              type="password"
              value={nsecInput}
              onChange={(e) => setNsecInput(e.target.value)}
              className="rounded-lg focus-visible:ring-primary"
              placeholder="nsec1..."
              disabled={isLoading}
            />
            {nsecInput && !isNsecValid && (
              <div className="text-destructive text-xs">
                Invalid nsec format. Must start with "nsec1"
              </div>
            )}
          </div>

          <Button
            className="w-full rounded-full py-6"
            onClick={handleNsecAuth}
            disabled={isLoading || !isNsecValid}
          >
            {isLoading ? "Verifying private key..." : "Login with Nsec"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="bunker" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bunkerUri">Bunker URI</Label>
          <Input
            id="bunkerUri"
            value={bunkerInput}
            onChange={(e) => setBunkerInput(e.target.value)}
            className="rounded-lg focus-visible:ring-primary"
            placeholder="bunker://"
            disabled={isLoading}
          />
          {bunkerInput && !isBunkerValid && (
            <div className="text-destructive text-xs">
              URI must start with bunker://
            </div>
          )}
        </div>

        <Button
          className="w-full rounded-full py-6"
          onClick={handleBunkerAuth}
          disabled={isLoading || !isBunkerValid}
        >
          {isLoading ? "Connecting to bunker..." : "Login with Bunker"}
        </Button>
      </TabsContent>
    </Tabs>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Linked Account Found
        </CardTitle>
        <CardDescription>
          We found a Nostr account linked to your Wavlake account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Expected Account Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Expected Account:</span>
            {expectedAccount?.isMostRecentlyLinked && (
              <Badge variant="secondary">Most Recent</Badge>
            )}
          </div>
          
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <code className="text-sm">{expectedPubkey ? formatPubkey(expectedPubkey) : 'Unknown'}</code>
            </div>
            {expectedAccount?.linkedAt && (
              <div className="text-xs text-muted-foreground">
                Linked {formatTimeAgo(expectedAccount.linkedAt)}
              </div>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Tabbed Authentication Interface */}
        {renderAuthTabs()}
        
        {/* Navigation Buttons */}
        <div className="space-y-2">
          {onUseDifferentAccount && (
            <Button
              variant="outline"
              onClick={onUseDifferentAccount}
              className="w-full"
              disabled={isLoading}
            >
              Use Different Account
            </Button>
          )}
          
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
              disabled={isLoading}
            >
              Back
            </Button>
          )}
        </div>
        
        {/* Help Text */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            You need to authenticate with the specific Nostr account that's linked to your Wavlake account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}