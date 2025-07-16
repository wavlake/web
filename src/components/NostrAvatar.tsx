import { useAuthor } from "@/hooks/useAuthor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/useToast";
import { nip19 } from "nostr-tools";
import { Copy } from "lucide-react";

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

  const avatarUrl = profile?.data?.metadata?.picture;

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

  const displayName =
    profile.data?.metadata?.name ||
    profile.data?.metadata?.display_name ||
    npubKey.slice(0, 10) + "..." + npubKey.slice(-4);

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
        <div className="text-center flex items-center gap-2">
          <span>{displayName}</span>

          <button
            onClick={handleCopyPubkey}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Copy pubkey"
          >
            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};
