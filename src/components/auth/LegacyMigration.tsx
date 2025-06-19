import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { NostrEvent } from "@nostrify/nostrify";

import { useLegacyMigration } from "@/hooks/useLegacyMigration";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Component for migrating legacy Firebase users to hybrid auth
 * Shows when user is logged into Firebase but not Nostr
 */
export function LegacyMigration() {
  const { user: nostrUser } = useCurrentUser();
  const {
    isLegacyUser,
    needsMigration,
    isLoading,
    error,
    migrateLegacyUser,
    isMigrating,
  } = useLegacyMigration();

  const [migrationStep, setMigrationStep] = useState<'intro' | 'signing' | 'complete'>('intro');

  // Don't show if user has Nostr auth or isn't a legacy user
  if (nostrUser || !isLegacyUser || !needsMigration) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">Checking account status...</div>
        </CardContent>
      </Card>
    );
  }

  const handleMigration = async () => {
    if (!window.nostr) {
      alert("Please install a Nostr extension (like Alby or nos2x) to continue.");
      return;
    }

    try {
      setMigrationStep('signing');
      
      // Get Nostr pubkey
      const pubkey = await window.nostr.getPublicKey();
      
      // Create challenge for migration
      const challenge = `Migrate Firebase account to hybrid auth at ${Date.now()}`;
      
      // Create event to sign
      const event: Partial<NostrEvent> = {
        kind: 22242,
        content: challenge,
        tags: [
          ["challenge", challenge],
          ["p", pubkey],
          ["t", "wavlake-migration"],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign the event
      const signedEvent = await window.nostr.signEvent(event as NostrEvent);
      
      // Submit migration
      await migrateLegacyUser({
        nostrPubkey: pubkey,
        signature: JSON.stringify(signedEvent),
        challenge,
      });

      setMigrationStep('complete');
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStep('intro');
    }
  };

  if (migrationStep === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <CardTitle className="text-green-800">Migration Complete! 🎉</CardTitle>
          <CardDescription className="text-green-600">
            Your account now supports both Firebase and Nostr authentication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-700">
            <p>✅ Nostr keypair linked to your account</p>
            <p>✅ All your existing data preserved</p>
            <p>✅ Email recovery still available</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
          >
            Continue to App
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          Account Migration Required
          <Badge variant="secondary">Legacy User</Badge>
        </CardTitle>
        <CardDescription>
          {migrationStep === 'intro' 
            ? "Link a Nostr keypair to enable publishing features"
            : "Please sign the migration request with your Nostr extension"
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {migrationStep === 'intro' && (
          <>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What's changing?</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Your existing account and data stay the same</li>
                  <li>• You'll be able to use publishing features</li>
                  <li>• Email recovery remains available</li>
                  <li>• Enhanced security with Nostr signatures</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">What you need:</h4>
                <ul className="space-y-1 text-amber-700">
                  <li>• A Nostr extension (Alby, nos2x, etc.)</li>
                  <li>• Or a Nostr keypair you control</li>
                </ul>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {migrationStep === 'signing' && (
          <div className="text-center space-y-3">
            <div className="animate-pulse">
              <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                🔐
              </div>
              <p className="text-sm text-gray-600">
                Check your Nostr extension for a signing request...
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {migrationStep === 'intro' && (
          <div className="w-full space-y-2">
            <Button 
              onClick={handleMigration}
              disabled={isMigrating}
              className="w-full"
            >
              {isMigrating ? "Migrating..." : "Start Migration"}
            </Button>
            <Button variant="ghost" className="w-full text-sm">
              Skip for now (limited features)
            </Button>
          </div>
        )}

        {migrationStep === 'signing' && (
          <Button 
            onClick={() => setMigrationStep('intro')}
            variant="outline" 
            className="w-full"
          >
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: NostrEvent): Promise<NostrEvent>;
    };
  }
}