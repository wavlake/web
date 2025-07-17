/**
 * Account Generation Step
 * 
 * Shows progress while generating a new Nostr keypair for legacy migration.
 * This step is purely informational as the actual generation happens automatically.
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyIcon, ShieldCheckIcon, AlertCircle } from 'lucide-react';

interface AccountGenerationStepProps {
  isLoading: boolean;
  error: string | null;
}

export function AccountGenerationStep({ isLoading, error }: AccountGenerationStepProps) {
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <KeyIcon className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>
            {isLoading ? "Generating Your Nostr Account" : "Account Ready"}
          </CardTitle>
          <CardDescription>
            {isLoading 
              ? "Creating a secure new Nostr keypair for you..." 
              : "Your new Nostr account has been generated successfully"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>Generating cryptographic keys...</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span className="text-muted-foreground">Creating Nostr identity...</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span className="text-muted-foreground">Preparing account linking...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-green-600">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Secure keypair generated</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-green-600">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Nostr identity created</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-green-600">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Ready for account linking</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <KeyIcon className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium mb-1">Security Note</div>
                <p>Your private key is generated locally and stored securely in your browser. We never see or store your private keys.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}