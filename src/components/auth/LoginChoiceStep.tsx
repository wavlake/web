import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Mail, Key } from 'lucide-react';

interface LoginChoiceStepProps {
  onSelect: (choice: 'get-started' | 'wavlake-account' | 'nostr-account') => void;
}

export const LoginChoiceStep: React.FC<LoginChoiceStepProps> = ({ onSelect }) => {
  return (
    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
      <DialogHeader className="px-6 pt-6 pb-0 relative">
        <DialogTitle className="text-xl font-semibold text-center">
          Welcome to Wavlake
        </DialogTitle>
        <DialogDescription className="text-center text-muted-foreground mt-2">
          Choose how you'd like to get started
        </DialogDescription>
      </DialogHeader>
      
      <div className="px-6 py-8 space-y-4">
        <Button 
          onClick={() => onSelect('get-started')}
          className="w-full h-auto py-4 px-4 rounded-xl flex flex-col items-center gap-2 text-left bg-primary hover:bg-primary/90"
          size="lg"
        >
          <div className="flex items-center gap-3 w-full">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">Get Started</div>
              <div className="text-sm text-primary-foreground/80 mt-1">
                New to Wavlake? We'll create an account for you
              </div>
            </div>
          </div>
        </Button>
        
        <Button 
          onClick={() => onSelect('wavlake-account')}
          variant="outline"
          className="w-full h-auto py-4 px-4 rounded-xl flex flex-col items-center gap-2 text-left border-2 hover:bg-muted/50"
          size="lg"
        >
          <div className="flex items-center gap-3 w-full">
            <Mail className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">I have a Wavlake account</div>
              <div className="text-sm text-muted-foreground mt-1">
                Sign in with your existing email address
              </div>
            </div>
          </div>
        </Button>
        
        <Button 
          onClick={() => onSelect('nostr-account')}
          variant="ghost"
          className="w-full h-auto py-4 px-4 rounded-xl flex flex-col items-center gap-2 text-left hover:bg-muted/50"
          size="lg"
        >
          <div className="flex items-center gap-3 w-full">
            <Key className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">I have a Nostr account</div>
              <div className="text-sm text-muted-foreground mt-1">
                Sign in with your existing Nostr keys
              </div>
            </div>
          </div>
        </Button>
      </div>
    </DialogContent>
  );
};