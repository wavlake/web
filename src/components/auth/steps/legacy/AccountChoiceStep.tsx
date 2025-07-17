/**
 * Account Choice Step
 * 
 * Allows users to choose between generating a new Nostr account
 * or bringing their own existing keypair for legacy migration.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyIcon, PlusIcon, ImportIcon } from 'lucide-react';

interface AccountChoiceStepProps {
  onGenerateNew: () => void;
  onBringOwn: () => void;
}

export function AccountChoiceStep({ onGenerateNew, onBringOwn }: AccountChoiceStepProps) {
  const handleGenerateNew = () => {
    try {
      onGenerateNew();
    } catch (err) {
      // Error is handled by the state machine
      console.error("Failed to select generate new account:", err);
    }
  };

  const handleBringOwn = () => {
    try {
      onBringOwn();
    } catch (err) {
      // Error is handled by the state machine
      console.error("Failed to select bring own keypair:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2 mb-6">
        <h3 className="text-lg font-semibold">Choose Your Nostr Account Option</h3>
        <p className="text-muted-foreground">
          You'll need a Nostr account to complete the migration. Choose how you'd like to proceed.
        </p>
      </div>

      <Card className="border-2 transition-colors hover:border-primary cursor-pointer" onClick={handleGenerateNew}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PlusIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Generate New Account</CardTitle>
              <CardDescription>
                We'll create a new Nostr keypair for you (recommended)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Secure new Nostr identity generated automatically</li>
            <li>• No existing keys required</li>
            <li>• Best for new Nostr users</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-2 transition-colors hover:border-primary cursor-pointer" onClick={handleBringOwn}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <ImportIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Use Existing Keypair</CardTitle>
              <CardDescription>
                Import your existing Nostr private key
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Keep your existing Nostr identity</li>
            <li>• Requires your private key (nsec)</li>
            <li>• Preserves your Nostr history and follows</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center mt-4">
        <KeyIcon className="w-4 h-4 inline mr-1" />
        Your keys will be securely stored locally in your browser
      </div>
    </div>
  );
}