import { useState, useEffect } from 'react';
import { ImagePreview } from './ImagePreview';
import { ExternalLink } from 'lucide-react';

interface PostImageProps {
  url: string;
}

export function PostImage({ url }: PostImageProps) {
  const [imageUrl, setImageUrl] = useState(url);
  
  // Process the URL to ensure it's a valid image URL
  useEffect(() => {
    // Check if the URL is already a direct image URL
    const isDirectImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp|tiff|avif|heic)(\?.*)?$/i.test(url);
    
    if (isDirectImageUrl) {
      setImageUrl(url);
      return;
    }
    
    // Handle special cases for different image hosts
    
    // Imgur
    if (url.includes('imgur.com') && !url.includes('i.imgur.com')) {
      // Convert imgur.com/abc to i.imgur.com/abc.jpg
      const imgurId = url.match(/imgur\.com\/([a-zA-Z0-9]+)/i)?.[1];
      if (imgurId) {
        setImageUrl(`https://i.imgur.com/${imgurId}.jpg`);
        return;
      }
    }
    
    // Nostr.build
    if (url.includes('nostr.build') && !url.includes('/i/')) {
      // Convert nostr.build/abc to nostr.build/i/abc
      const nostrBuildPath = url.match(/nostr\.build\/([^?#]+)/i)?.[1];
      if (nostrBuildPath) {
        setImageUrl(`https://nostr.build/i/${nostrBuildPath}`);
        return;
      }
    }
    
    // For other URLs, just use as is
    setImageUrl(url);
  }, [url]);
  
  return (
    <div className="relative group">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        <ImagePreview src={imageUrl} alt="Post image" />
        
        {/* Small icon in the corner to indicate it's clickable */}
        <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={14} />
        </div>
      </a>
    </div>
  );
}