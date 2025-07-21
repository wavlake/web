import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NostrTrack } from "@/types/music";
import {
  Music,
  Calendar,
  Clock,
  DollarSign,
  Tag,
  User,
  Hash,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Code,
} from "lucide-react";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { toast } from "sonner";
import { nip19 } from "nostr-tools";
import { KINDS } from "@/lib/nostr-kinds";
import { useState } from "react";

interface TrackDetailsDialogProps {
  track: NostrTrack | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TrackDetailsDialog({
  track,
  isOpen,
  onClose,
}: TrackDetailsDialogProps) {
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();
  const [isRawEventOpen, setIsRawEventOpen] = useState(false);

  if (!track) return null;

  const formatCurrency = (amount: number) => {
    if (showSats) {
      return `${amount.toLocaleString()} sats`;
    }
    return btcPrice
      ? formatUSD(satsToUSD(amount, btcPrice.USD))
      : `${amount.toLocaleString()} sats`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyEventId = async () => {
    try {
      await navigator.clipboard.writeText(track.id);
      toast.success("Event ID copied to clipboard!");
    } catch (error) {
      console.error("Error copying event ID:", error);
      toast.error("Failed to copy event ID");
    }
  };

  const handleCopyNjumpLink = async () => {
    try {
      const nevent = nip19.neventEncode({
        id: track.id,
        author: track.pubkey,
        kind: KINDS.MUSIC_TRACK,
        relays: [import.meta.env.VITE_RELAY_URL],
      });
      const njumpUrl = `https://njump.me/${nevent}`;
      await navigator.clipboard.writeText(njumpUrl);
      toast.success("Njump link copied to clipboard!");
    } catch (error) {
      console.error("Error copying njump link:", error);
      toast.error("Failed to copy njump link");
    }
  };

  const handleOpenNjump = () => {
    try {
      const nevent = nip19.neventEncode({
        id: track.id,
        author: track.pubkey,
        kind: KINDS.MUSIC_TRACK,
        relays: [import.meta.env.VITE_RELAY_URL],
      });
      const njumpUrl = `https://njump.me/${nevent}`;
      window.open(njumpUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening njump link:", error);
      toast.error("Failed to open njump link");
    }
  };

  const handleCopyRawEvent = async () => {
    try {
      const rawEventJson = JSON.stringify(track.event, null, 2);
      await navigator.clipboard.writeText(rawEventJson);
      toast.success("Raw event JSON copied to clipboard!");
    } catch (error) {
      console.error("Error copying raw event:", error);
      toast.error("Failed to copy raw event");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Track Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cover Art & Basic Info */}
          <div className="flex gap-4">
            {track.coverUrl && (
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-bold">{track.title}</h2>
              <p className="text-muted-foreground flex items-center gap-1">
                <User className="w-4 h-4" />
                {track.artist}
              </p>
              {track.genre && (
                <Badge variant="secondary" className="w-fit">
                  {track.genre}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {track.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{track.description}</p>
            </div>
          )}

          <Separator />

          {/* Track Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold">Track Information</h3>

              {track.albumTitle && (
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Album: {track.albumTitle}</span>
                </div>
              )}

              {track.trackNumber && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Track #{track.trackNumber}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Duration: {formatDuration(track.duration)}
                </span>
              </div>

              {!!track.price && track.price > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Price: {formatCurrency(track.price)}
                  </span>
                </div>
              )}

              {track.explicit && (
                <Badge variant="destructive" className="w-fit">
                  Explicit Content
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Publishing Info</h3>

              {track.releaseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Released: {new Date(track.releaseDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Published:{" "}
                  {new Date(track.created_at * 1000).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Event ID:</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {track.id}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyEventId}
                    title="Copy full event ID"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {track.tags && track.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {track.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Raw Event Viewer - Full Width */}
          <div className="space-y-2 min-w-0 w-full max-w-full overflow-hidden">
            <Collapsible open={isRawEventOpen} onOpenChange={setIsRawEventOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 p-0 h-auto"
                >
                  {isRawEventOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">View Raw Event</span>
                  <Code className="w-4 h-4 text-muted-foreground" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent
                className="space-y-2 mt-2 min-w-0 w-full overflow-hidden"
                style={{ maxWidth: "100%" }}
              >
                <div className="flex items-center justify-between min-w-0 w-full">
                  <span className="text-xs text-muted-foreground">
                    Event JSON
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyRawEvent}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy JSON
                  </Button>
                </div>
                <div
                  className="w-full overflow-hidden"
                  style={{ maxWidth: "100%" }}
                >
                  <pre
                    className="text-xs bg-muted p-3 rounded border max-h-64 overflow-y-auto whitespace-pre-wrap break-words w-full"
                    style={{ maxWidth: "100%", wordBreak: "break-all" }}
                  >
                    <code
                      className="whitespace-pre-wrap break-words block"
                      style={{ maxWidth: "100%", wordBreak: "break-all" }}
                    >
                      {JSON.stringify(track.event, null, 2)}
                    </code>
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Separator />

          {/* Media Links */}
          <div className="space-y-3">
            <h3 className="font-semibold">Media & Links</h3>
            <div className="flex flex-wrap gap-2">
              {track.audioUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={track.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Audio File
                  </a>
                </Button>
              )}

              {track.coverUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={track.coverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Cover Art
                  </a>
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleOpenNjump}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Open in Njump
              </Button>

              <Button variant="outline" size="sm" onClick={handleCopyNjumpLink}>
                <Copy className="w-4 h-4 mr-1" />
                Copy Njump Link
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
