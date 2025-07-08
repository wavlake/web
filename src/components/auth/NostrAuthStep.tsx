import React, { useState, useCallback } from "react";
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
import { logAuthError, logAuthInfo } from "@/lib/authLogger";
import { truncatePubkey, getDisplayName } from "@/lib/pubkeyUtils";

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
    // Log the authentication attempt
    logAuthInfo('nostr-auth-step-start', firebaseUser, selectedPubkey || undefined, linkedPubkeys.length);
    
    try {
      // Attempt auto-linking if Firebase user is present
      if (firebaseUser) {
        const linkResult = await autoLink(firebaseUser, selectedPubkey || undefined);
        if (linkResult.success) {
          logAuthInfo('nostr-auth-step-link-success', firebaseUser, selectedPubkey || undefined);
        }
        // Note: Linking failures are handled within autoLink and shouldn't block login
      }
      
      // Note: LoginDialog handles the actual Nostr login internally
      // We create a placeholder login object to satisfy the interface
      // In production, this would be replaced with actual login data from useCurrentUser
      const placeholderLogin: NLoginType = {
        id: 'placeholder-' + Date.now(),
        type: 'extension' as const,
        pubkey: selectedPubkey || 'placeholder-pubkey',
        createdAt: new Date().toISOString(),
        data: null
      };
      
      logAuthInfo('nostr-auth-step-success', firebaseUser, selectedPubkey || undefined);
      onSuccess(placeholderLogin);
    } catch (error) {
      // Log the error with proper context
      logAuthError('nostr-auth-step', error, firebaseUser, selectedPubkey || undefined, linkedPubkeys.length);
      
      // Continue with sign-in even if linking fails
      // This ensures user can still authenticate even if account linking has issues
      const placeholderLogin: NLoginType = {
        id: 'placeholder-' + Date.now(),
        type: 'extension' as const,
        pubkey: selectedPubkey || 'placeholder-pubkey',
        createdAt: new Date().toISOString(),
        data: null
      };
      onSuccess(placeholderLogin);
    }
  };

  /**
   * Handles the "Generate New Account" flow for new users
   * Future implementation will guide users through generating a new Nostr keypair
   * For now, directs users to the standard Nostr login where they can use extensions
   * or manually generate keys through other means
   */
  const handleCreateNewAccount = async () => {
    // TODO: Implement guided account generation
    // This should guide users through:
    // 1. Explanation of Nostr keypairs
    // 2. Options: browser extension, manual generation, or recommended tools
    // 3. Security best practices
    // 4. Backup instructions
    setShowLoginDialog(true);
  };

  // Simple event handlers - no need for useCallback optimization here
  // These are lightweight functions with minimal re-render impact
  const handleShowLoginDialog = () => setShowLoginDialog(true);
  const handleCloseLoginDialog = () => setShowLoginDialog(false);
  const handleSelectMode = () => setMode('select');
  
  // This callback is justified as it depends on external props that may change
  const handleBackFromLogin = useCallback(() => {
    setShowLoginDialog(false);
    if (linkedPubkeys.length > 0) {
      setMode('select');
    } else {
      onBack();
    }
  }, [linkedPubkeys.length, onBack]);

  // This callback factory is justified as it prevents recreation of click handlers
  const createAccountClickHandler = useCallback((pubkey: string) => () => {
    setSelectedPubkey(pubkey);
    setShowLoginDialog(true);
  }, []);

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
              onClick={createAccountClickHandler(account.pubkey)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  {getDisplayName(account.profile)?.[0] || account.pubkey.slice(0, 2)}
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
            onClick={handleShowLoginDialog} 
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
          onClose={handleCloseLoginDialog}
          onLogin={handleNostrLoginSuccess}
        />
        {/* Back button overlay */}
        <div className="fixed bottom-4 left-4 z-50">
          <Button
            onClick={handleBackFromLogin}
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
          onClick={handleShowLoginDialog}
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
              onClick={handleSelectMode}
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