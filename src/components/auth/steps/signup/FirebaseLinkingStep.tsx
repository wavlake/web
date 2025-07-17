/**
 * FirebaseLinkingStep Component
 * 
 * Handles the linking of Firebase account to Nostr account during signup
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Link, Loader2 } from 'lucide-react';

interface FirebaseLinkingStepProps {
  onComplete: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  firebaseUser: {
    email?: string | null;
    uid: string;
  } | null;
}

export function FirebaseLinkingStep({ 
  onComplete, 
  isLoading, 
  error,
  firebaseUser
}: FirebaseLinkingStepProps) {

  const handleLink = async () => {
    try {
      await onComplete();
    } catch (err) {
      console.error("Failed to link Firebase account:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Success info card */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <CardTitle className="text-sm text-green-900">Email Account Created</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-green-700 text-sm">
            Your email account has been successfully created. Now we'll link it to your Nostr identity.
          </CardDescription>
          {firebaseUser?.email && (
            <p className="text-xs text-green-600 mt-2">
              Email: {firebaseUser.email}
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Linking explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="w-4 h-4" />
            Account Linking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              We're now linking your email account to your Nostr identity. This provides:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Account recovery if you lose your Nostr keys</li>
              <li>Access to music upload and artist features</li>
              <li>Secure backup of your account data</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Link button */}
      <Button
        onClick={handleLink}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Linking accounts...
          </>
        ) : (
          <>
            <Link className="mr-2 h-4 w-4" />
            Link My Accounts
          </>
        )}
      </Button>
    </div>
  );
}