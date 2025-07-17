/**
 * ArtistTypeStep Component
 * 
 * Second step for artists to choose between Solo Artist and Band/Group
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon, UsersIcon, AlertCircle } from 'lucide-react';

interface ArtistTypeStepProps {
  onComplete: (isSolo: boolean) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function ArtistTypeStep({ onComplete, isLoading, error }: ArtistTypeStepProps) {
  const handleSelectSolo = async () => {
    try {
      await onComplete(true);
    } catch (err) {
      console.error("Failed to select solo artist:", err);
    }
  };

  const handleSelectBand = async () => {
    try {
      await onComplete(false);
    } catch (err) {
      console.error("Failed to select band:", err);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSelectSolo}
        disabled={isLoading}
        variant="outline"
        className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors hover:border-primary"
        size="lg"
      >
        <div className="flex items-center gap-3 w-full">
          <UserIcon className="w-5 h-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-base">Solo Artist</div>
            <div className="text-sm text-muted-foreground mt-1">
              Individual musician or performer
            </div>
          </div>
        </div>
      </Button>

      <Button
        onClick={handleSelectBand}
        disabled={isLoading}
        variant="outline"
        className="w-full h-auto min-h-[80px] py-4 px-4 rounded-xl text-left border-2 transition-colors hover:border-primary"
        size="lg"
      >
        <div className="flex items-center gap-3 w-full">
          <UsersIcon className="w-5 h-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-base">Band / Group</div>
            <div className="text-sm text-muted-foreground mt-1">
              Multiple members or collaborative project
            </div>
          </div>
        </div>
      </Button>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Creating your artist account...
        </div>
      )}
    </div>
  );
}