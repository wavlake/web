import { useAuthor } from "@/hooks/useAuthor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/useToast";
import { nip19 } from "nostr-tools";
import { useState } from "react";

export const NostrAvatar = ({
  pubkey,
  size = 40,
  includeName = false,
}: {
  pubkey: string;
  size?: number;
  includeName?: boolean;
}) => {
  const profile = useAuthor(pubkey);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  
  const avatarUrl =
    profile?.data?.metadata?.picture ||
    `https://robohash.org/${pubkey}.png?size=${size}x${size}`;
  
  // Convert pubkey to npub format for tooltip
  const npubKey = nip19.npubEncode(pubkey);
  
  // Handle clipboard copy
  const handleCopyPubkey = async () => {
    try {
      await navigator.clipboard.writeText(npubKey);
      toast({
        title: "Copied to clipboard",
        description: "Pubkey copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy pubkey:", error);
      toast({
        title: "Copy failed",
        description: "Failed to copy pubkey to clipboard",
        variant: "destructive",
      });
    }
  };
  
  const displayName = profile.data?.metadata?.name ||
    profile.data?.metadata?.display_name ||
    pubkey;
  
  return (
    <div className="flex flex-col items-center mt-4 space-y-3">
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-sm">
          {profile.data?.metadata?.name?.[0]?.toUpperCase() ||
            profile.data?.metadata?.display_name?.[0]?.toUpperCase() ||
            pubkey.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {includeName && (
        <TooltipProvider>
          <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
            <TooltipTrigger asChild>
              <div 
                className="text-center cursor-pointer hover:text-primary transition-colors"
                onClick={handleCopyPubkey}
                onMouseEnter={() => setIsTooltipOpen(true)}
                onMouseLeave={() => setIsTooltipOpen(false)}
              >
                {displayName}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs break-all max-w-xs">
                {npubKey}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
