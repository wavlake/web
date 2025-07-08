import React, { useState } from "react";
import { type NLoginType } from '@nostrify/react/login';
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginDialog from "./LoginDialog";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";

interface FirebaseUser {
  uid: string;
  email: string | null;
}

interface NostrAuthStepProps {
  firebaseUser?: FirebaseUser;
  linkedPubkeys: Array<{pubkey: string, profile?: {name?: string; display_name?: string; picture?: string; about?: string}}>;
  onSuccess: (login: NLoginType) => void;
  onBack: () => void;
}

type AuthMode = 'select' | 'auth' | 'generate';

export const NostrAuthStep: React.FC<NostrAuthStepProps> = ({
  firebaseUser,
  linkedPubkeys,
  onSuccess,
  onBack
}) => {
  const { autoLink } = useAutoLinkPubkey();
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('select');
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const handleNostrLoginSuccess = async () => {
    try {
      // Attempt auto-linking if Firebase user is present
      if (firebaseUser) {
        await autoLink();
      }
      
      // Note: LoginDialog handles the actual Nostr login internally
      // We create a placeholder login object to satisfy the interface
      // In production, this would be replaced with actual login data from useCurrentUser
      const placeholderLogin: NLoginType = {
        id: 'placeholder-' + Date.now(),
        type: 'extension' as const,
        pubkey: 'placeholder-pubkey',
        createdAt: new Date().toISOString(),
        data: null
      };
      
      onSuccess(placeholderLogin);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Authentication or linking error:', errorMessage);
      
      // Continue with sign-in even if linking fails
      const placeholderLogin: NLoginType = {
        id: 'placeholder-' + Date.now(),
        type: 'extension' as const,
        pubkey: 'placeholder-pubkey',
        createdAt: new Date().toISOString(),
        data: null
      };
      onSuccess(placeholderLogin);
    }
  };

  const handleCreateNewAccount = async () => {
    // This would implement account generation in a future iteration
    // For now, just redirect to the normal Nostr login
    setShowLoginDialog(true);
  };

  // Show profile selection if we have linked pubkeys and haven't selected one yet
  if (mode === 'select' && linkedPubkeys.length > 0) {
    return (
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Your Account</DialogTitle>
          <DialogDescription>
            We found {linkedPubkeys.length} Nostr account(s) linked to your email
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {linkedPubkeys.map((account) => (
            <div
              key={account.pubkey}
              className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setSelectedPubkey(account.pubkey);
                setShowLoginDialog(true);
              }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  {account.profile?.name?.[0] || account.pubkey.slice(0, 2)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">
                    {account.profile?.name || 'Unnamed Account'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {account.pubkey.slice(0, 8)}...{account.pubkey.slice(-8)}
                  </p>
                </div>
                <div className="text-muted-foreground">→</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={() => setShowLoginDialog(true)} 
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

  // Show the standard Nostr login dialog
  if (showLoginDialog) {
    return (
      <div className="relative">
        <LoginDialog
          isOpen={true}
          onClose={() => setShowLoginDialog(false)}
          onLogin={handleNostrLoginSuccess}
        />
        {/* Back button overlay */}
        <div className="fixed bottom-4 left-4 z-50">
          <Button
            onClick={() => {
              setShowLoginDialog(false);
              if (linkedPubkeys.length > 0) {
                setMode('select');
              } else {
                onBack();
              }
            }}
            variant="outline"
            size="sm"
          >
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  // Default state - show Nostr authentication options
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Sign in with Nostr</DialogTitle>
        <DialogDescription>
          {selectedPubkey ? 
            `Please sign in with your account ending in ...${selectedPubkey.slice(-8)}` :
            firebaseUser ? 
              "Sign in with any Nostr account. This will be linked to your Wavlake account." :
              "Choose how you'd like to authenticate with Nostr."
          }
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <Button 
          onClick={() => setShowLoginDialog(true)}
          className="w-full"
          size="lg"
        >
          Continue with Nostr
        </Button>
        
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          {linkedPubkeys.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setMode('select')}
            >
              Choose Account
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default NostrAuthStep;