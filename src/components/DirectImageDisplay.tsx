import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DirectImageDisplayProps {
  url: string;
}

export function DirectImageDisplay({ url }: DirectImageDisplayProps) {
  const [showImage, setShowImage] = useState(false);
  
  return (
    <div className="border border-dashed border-blue-500 p-2 my-2 rounded-md bg-blue-50 dark:bg-blue-950/20">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Direct Image Test</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowImage(!showImage)}
          className="h-6 text-xs"
        >
          {showImage ? 'Hide Image' : 'Show Image'}
        </Button>
      </div>
      
      {showImage && (
        <div className="space-y-2">
          <p className="text-xs break-all bg-muted p-1 rounded">{url}</p>
          <img 
            src={url} 
            alt="Direct test" 
            className="max-w-full max-h-[512px] rounded-md object-contain"
            onError={() => console.error('Direct image load failed:', url)}
          />
        </div>
      )}
    </div>
  );
}