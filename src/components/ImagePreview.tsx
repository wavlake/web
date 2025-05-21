import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
}

export function ImagePreview({ src, alt = 'Image', className }: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  // Process and normalize the URL
  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }
    
    try {
      let url = src.trim();
      
      // Fix common URL issues
      
      // 1. Handle nostr.build URLs
      if (url.includes('nostr.build') && !url.includes('/i/')) {
        // Convert regular nostr.build URLs to their image endpoint
        url = url.replace(/nostr\.build\/([^/i])/i, 'nostr.build/i/$1');
      }
      
      // 2. Handle imgur URLs without direct image links
      if (url.match(/imgur\.com\/[a-zA-Z0-9]+$/i) && !url.includes('.jpg') && !url.includes('.png')) {
        // Add .jpg to direct imgur links
        url = `${url}.jpg`;
      }
      
      // 3. Handle Twitter/X image URLs
      if (url.includes('pbs.twimg.com') && url.includes('&name=')) {
        // Remove size parameters for Twitter images
        url = url.replace(/&name=[^&]+/, '');
      }
      
      // 4. Handle URLs with unescaped characters
      if (url.includes(' ')) {
        url = url.replace(/ /g, '%20');
      }
      
      // Set the processed URL
      setImageUrl(url);
      setIsLoading(true);
      setHasError(false);
      
    } catch (error) {
      console.error('Error processing image URL:', src, error);
      setHasError(true);
    }
  }, [src]);
  
  const handleLoad = () => {
    setIsLoading(false);
  };
  
  const handleError = () => {
    console.error('Failed to load image:', imageUrl, 'Original URL:', src);
    setIsLoading(false);
    setHasError(true);
    
    // Try alternative URL formats if the original fails
    if (!imageUrl.includes('?format=')) {
      // Some services support format parameter
      const newUrl = `${imageUrl}?format=jpg`;
      console.log('Trying alternative URL format:', newUrl);
      setImageUrl(newUrl);
      setIsLoading(true);
      setHasError(false);
    }
  };
  
  if (!imageUrl || (hasError && !isLoading)) {
    return null;
  }
  
  return (
    <div className={cn("relative rounded-md overflow-hidden my-2 max-w-full", className)}>
      {isLoading && (
        <Skeleton className="w-full h-48 rounded-md" />
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "max-w-full max-h-[512px] rounded-md object-contain",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}