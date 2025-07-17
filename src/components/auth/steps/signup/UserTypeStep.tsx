/**
 * UserTypeStep Component
 * 
 * First step in signup flow where users choose between Artist and Listener
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MicIcon, HeadphonesIcon, AlertCircle } from 'lucide-react';

interface UserTypeStepProps {
  onComplete: (isArtist: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function UserTypeStep({ onComplete, isLoading, error }: UserTypeStepProps) {
  const handleSelectArtist = async () => {
    try {
      await onComplete(true);
    } catch (err) {
      // Error is handled by the state machine
      console.error("Failed to select artist:", err);
    }
  };

  const handleSelectListener = async () => {
    try {
      await onComplete(false);
    } catch (err) {
      // Error is handled by the state machine
      console.error("Failed to select listener:", err);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSelectArtist}
        disabled={isLoading}
        variant="outline"
        className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors hover:border-primary"
        size="lg"
      >
        <div className="flex items-center gap-3 w-full">
          <MicIcon className="w-5 h-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-base">Artist</div>
            <div className="text-sm text-muted-foreground mt-1">
              Share your music and connect with fans
            </div>
          </div>
        </div>
      </Button>

      <Button
        onClick={handleSelectListener}
        disabled={isLoading}
        variant="outline"
        className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors hover:border-primary"
        size="lg"
      >
        <div className="flex items-center gap-3 w-full">
          <HeadphonesIcon className="w-5 h-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-base">Listener</div>
            <div className="text-sm text-muted-foreground mt-1">
              Discover and support your favorite artists
            </div>
          </div>
        </div>
      </Button>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Creating your account...
        </div>
      )}
    </div>
  );
}