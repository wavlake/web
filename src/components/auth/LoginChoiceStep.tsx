import React from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthChoice = 'nostr' | 'firebase' | 'new-user';

interface LoginChoiceStepProps {
  onSelect: (choice: AuthChoice) => void;
}

export const LoginChoiceStep: React.FC<LoginChoiceStepProps> = ({ 
  onSelect 
}) => {
  // Simple event handlers - useCallback not needed for basic function calls
  const handleNewUserSelect = () => onSelect('new-user');
  const handleFirebaseSelect = () => onSelect('firebase');
  const handleNostrSelect = () => onSelect('nostr');

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Welcome to Wavlake</DialogTitle>
        <DialogDescription>
          Choose how you'd like to get started
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <Button 
          onClick={handleNewUserSelect}
          className="w-full justify-start h-auto p-4 text-left"
          variant="outline"
          size="lg"
        >
          <div className="space-y-1">
            <div className="font-medium">Get Started</div>
            <div className="text-sm text-muted-foreground font-normal">
              New to Wavlake - create a Nostr account
            </div>
          </div>
        </Button>
        
        <Button 
          onClick={handleFirebaseSelect}
          className="w-full justify-start h-auto p-4 text-left"
          variant="outline"
          size="lg"
        >
          <div className="space-y-1">
            <div className="font-medium">I have a Wavlake account</div>
            <div className="text-sm text-muted-foreground font-normal">
              Sign in with your email address
            </div>
          </div>
        </Button>
        
        <Button 
          onClick={handleNostrSelect}
          className="w-full justify-start h-auto p-4 text-left"
          variant="ghost"
        >
          <div className="space-y-1">
            <div className="font-medium">I have a Nostr account</div>
            <div className="text-sm text-muted-foreground font-normal">
              Use your existing Nostr identity
            </div>
          </div>
        </Button>
      </div>
    </DialogContent>
  );
};

export default LoginChoiceStep;