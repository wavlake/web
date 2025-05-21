import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePreview } from './ImagePreview';

interface DebugImageDisplayProps {
  url: string;
}

export function DebugImageDisplay({ url }: DebugImageDisplayProps) {
  const [showDebug, setShowDebug] = useState(false);
  
  return (
    <div className="border border-dashed border-yellow-500 p-2 my-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Image Debug</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebug(!showDebug)}
          className="h-6 text-xs"
        >
          {showDebug ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>
      
      {showDebug && (
        <div className="space-y-2 text-xs">
          <div>
            <p className="font-medium">URL:</p>
            <p className="break-all bg-muted p-1 rounded">{url}</p>
          </div>
          
          <div>
            <p className="font-medium">Direct Image Preview:</p>
            <ImagePreview src={url} alt="Debug image" />
          </div>
        </div>
      )}
    </div>
  );
}