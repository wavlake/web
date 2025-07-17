/**
 * Loading Step Component
 * 
 * Generic loading step used across different authentication flows
 * when an async operation is in progress.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStepProps {
  title: string;
  description: string;
}

export function LoadingStep({ title, description }: LoadingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}