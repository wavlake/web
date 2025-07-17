import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Upload,
  Edit,
  Eye,
  MoreHorizontal,
  Filter,
  Star,
  Trash2,
  Search,
  X,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { TrackForm } from "./TrackForm";
import { AlbumForm } from "./AlbumForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCanUpload } from "@/hooks/useAccountLinkingStatus";
import { UploadRestrictionBannerCompact } from "./UploadRestrictionBanner";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useTrackNutzapTotals } from "@/hooks/useTrackNutzapTotals";
import { useCommunityContent, useCommunityTracks, useCommunityAlbums, useCommunityUploadHistory } from "@/hooks/useCommunityContent";
import { NostrAlbum } from "@/hooks/useArtistAlbums";
import { NostrTrack } from "@/types/music";
import { TrackDetailsDialog } from "./TrackDetailsDialog";
import { DraftTrack, DraftAlbum } from "@/types/drafts";
import { useAllDrafts } from "@/hooks/useDrafts";
import { useDraftPublish } from "@/hooks/useDraftPublish";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Hash,
  ExternalLink,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { nip19 } from "nostr-tools";
import { KINDS } from "@/lib/nostr-kinds";
import { useCommunityContext } from "@/contexts/CommunityContext";

// Upload history item types
interface BaseUploadItem {
  id: string;
  date: string;
  title: string;
  status: string;
  isDraft?: boolean;
}

interface TrackUploadItem extends BaseUploadItem {
  type: "track";
  isDraft: boolean;
  draftData?: DraftTrack;
}

interface AlbumUploadItem extends BaseUploadItem {
  type: "album";
  trackCount?: number;
  isDraft: boolean;
  draftData?: DraftAlbum;
}

// Legacy upload item (from upload history)
interface LegacyUploadItem extends BaseUploadItem {
  type?: "track" | "album";
  trackCount?: number;
  draftData?: DraftTrack | DraftAlbum;
}

type UploadItem = TrackUploadItem | AlbumUploadItem | LegacyUploadItem;

interface MusicPublisherProps {
  artistId?: string;
  communityId?: string;
}

export function MusicPublisher({ artistId, communityId }: MusicPublisherProps) {
  const { user } = useCurrentUser();
  const canUpload = useCanUpload();
  const {
    selectedCommunity,
    selectedCommunityId,
    userRole,
    canUpdateCommunity,
    isLoading,
  } = useCommunityContext();

  // Permission checks
  const isOwner = userRole === "owner";
  const isModerator = userRole === "moderator";
  const canCreateContent = isOwner; // Only community owners can create content
  const canModerateContent = isOwner || isModerator; // Owners and moderators can moderate

  // Content editing permission - only community owner can edit community content
  const canEditContent = (content: NostrTrack | NostrAlbum) => {
    // Community owner can edit all community content
    if (isOwner) return true;

    return false;
  };

  const [showTrackForm, setShowTrackForm] = useState(false);
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<NostrAlbum | null>(null);
  const [editingTrack, setEditingTrack] = useState<NostrTrack | null>(null);
  const [viewingTrack, setViewingTrack] = useState<NostrTrack | null>(null);
  const [viewingAlbum, setViewingAlbum] = useState<NostrAlbum | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<NostrTrack | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<NostrAlbum | null>(null);
  const [trackSearchQuery, setTrackSearchQuery] = useState("");
  const [editingDraftTrack, setEditingDraftTrack] = useState<DraftTrack | null>(
    null
  );
  const [editingDraftAlbum, setEditingDraftAlbum] = useState<DraftAlbum | null>(
    null
  );
  const [unpublishingContent, setUnpublishingContent] = useState<{
    type: "track" | "album";
    content: NostrTrack | NostrAlbum;
  } | null>(null);
  const [isAlbumRawEventOpen, setIsAlbumRawEventOpen] = useState(false);

  // Use consolidated community content hooks
  const { data: albums = [], isLoading: albumsLoading } = useCommunityAlbums();
  const { data: tracks = [], isLoading: tracksLoading } = useCommunityTracks();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (showSats) {
      return `${amount.toLocaleString()} sats`;
    }
    return btcPrice
      ? formatUSD(satsToUSD(amount, btcPrice.USD))
      : `${amount.toLocaleString()} sats`;
  };

  // Get all tracks from albums plus standalone tracks
  const allTracks = [
    ...albums.flatMap((album) =>
      album.tracks.map((track) => ({
        ...track,
        albumTitle: album.title,
        albumImage: album.coverUrl,
        price: track.price || 0,
      }))
    ),
    ...tracks
      .filter(
        (track) =>
          !albums.some((album) =>
            album.tracks.some((albumTrack) => albumTrack.id === track.id)
          )
      )
      .map((track) => ({
        ...track,
        albumTitle: track.albumTitle || "Single",
        albumImage: track.coverUrl,
        price: track.price || 0,
      })),
  ];

  // Filter tracks based on search query
  const filteredTracks = allTracks.filter((track) => {
    if (!trackSearchQuery.trim()) return true;

    const searchTerm = trackSearchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(searchTerm) ||
      track.artist.toLowerCase().includes(searchTerm) ||
      track.albumTitle.toLowerCase().includes(searchTerm) ||
      track.genre?.toLowerCase().includes(searchTerm) ||
      track.tags?.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  });

  // Get all track IDs for nutzap totals query
  const trackIds = allTracks.map((track) => track.id);
  const { data: nutzapTotals = [], isLoading: nutzapsLoading } =
    useTrackNutzapTotals(trackIds);

  // Create a map for quick lookup of nutzap totals
  const nutzapTotalMap = new Map(
    nutzapTotals.map((total) => [total.trackId, total.totalAmount])
  );

  // Get upload history from consolidated hook
  const { data: uploadHistory = [], isLoading: uploadHistoryLoading } =
    useCommunityUploadHistory();

  // Get drafts
  const {
    tracks: draftTracks,
    albums: draftAlbums,
    isLoading: draftsLoading,
  } = useAllDrafts();

  // Combine upload history with drafts for complete upload history
  const combinedUploadHistory: UploadItem[] = [
    ...uploadHistory,
    // Add draft tracks
    ...draftTracks.map((draft) => ({
      id: draft.draftEventId,
      date: new Date(draft.draftCreatedAt * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      title: draft.metadata.title,
      type: "track" as const,
      status: "Draft",
      isDraft: true as const,
      draftData: draft,
    })),
    // Add draft albums
    ...draftAlbums.map((draft) => ({
      id: draft.draftEventId,
      date: new Date(draft.draftCreatedAt * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      title: draft.metadata.title,
      type: "album" as const,
      status: "Draft",
      trackCount: draft.metadata.tracks.length,
      isDraft: true as const,
      draftData: draft,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date, newest first

  const {
    publishDraftTrack,
    publishDraftAlbum,
    deleteDraft,
    convertTrackToDraft,
    convertAlbumToDraft,
  } = useDraftPublish();

  const handleDeleteTrack = (track: NostrTrack) => {
    // For now, just show a placeholder - actual deletion would need to be implemented
    // This could involve publishing a deletion event or similar
    console.log("Delete track:", track);
    setDeletingTrack(null);
    // TODO: Implement actual track deletion logic
  };

  const handleDeleteAlbum = (album: NostrAlbum) => {
    // For now, just show a placeholder - actual deletion would need to be implemented
    // This could involve publishing a deletion event or similar
    console.log("Delete album:", album);
    setDeletingAlbum(null);
    // TODO: Implement actual album deletion logic
  };

  const handleCopyAlbumEventId = async (album: NostrAlbum) => {
    try {
      await navigator.clipboard.writeText(album.id);
      toast.success("Album Event ID copied to clipboard!");
    } catch (error) {
      console.error("Error copying album event ID:", error);
      toast.error("Failed to copy album event ID");
    }
  };

  const handleCopyAlbumNjumpLink = async (album: NostrAlbum) => {
    try {
      const nevent = nip19.neventEncode({
        id: album.id,
        author: album.pubkey,
        kind: KINDS.MUSIC_ALBUM,
        relays: ["wss://relay.wavlake.com"],
      });
      const njumpUrl = `https://njump.me/${nevent}`;
      await navigator.clipboard.writeText(njumpUrl);
      toast.success("Album Njump link copied to clipboard!");
    } catch (error) {
      console.error("Error copying album njump link:", error);
      toast.error("Failed to copy album njump link");
    }
  };

  const handleOpenAlbumNjump = (album: NostrAlbum) => {
    try {
      const nevent = nip19.neventEncode({
        id: album.id,
        author: album.pubkey,
        kind: KINDS.MUSIC_ALBUM,
        relays: ["wss://relay.wavlake.com"],
      });
      const njumpUrl = `https://njump.me/${nevent}`;
      window.open(njumpUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening album njump link:", error);
      toast.error("Failed to open album njump link");
    }
  };

  const handleCopyAlbumRawEvent = async (album: NostrAlbum) => {
    try {
      const rawEventJson = JSON.stringify(album.event, null, 2);
      await navigator.clipboard.writeText(rawEventJson);
      toast.success("Album raw event JSON copied to clipboard!");
    } catch (error) {
      console.error("Error copying album raw event:", error);
      toast.error("Failed to copy album raw event");
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Music Management</CardTitle>
          <CardDescription>
            You need to be logged in to manage your music.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please log in to start managing your music catalog.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while community context is loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2"></div>
          </div>
          <div className="h-10 w-40 bg-muted animate-pulse rounded"></div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-64 bg-muted animate-pulse rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no community is selected
  if (!selectedCommunity || !selectedCommunityId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            No Artist Page Selected
          </h2>
          <p className="text-muted-foreground mb-6">
            You must select or create an artist page to manage music content.
          </p>
          <Button onClick={() => (window.location.href = "/create-group")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Artist Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Music Management
          </h2>
          <p className="text-muted-foreground">
            {isModerator && !isOwner
              ? `View ${
                  selectedCommunity
                    ? selectedCommunity.tags.find(
                        (t) => t[0] === "name"
                      )?.[1] || "community"
                    : "community"
                } music content (read-only)`
              : `Manage ${
                  selectedCommunity
                    ? selectedCommunity.tags.find(
                        (t) => t[0] === "name"
                      )?.[1] || "community"
                    : "community"
                } music content`}
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => setShowTrackForm(true)}
          disabled={!canUpload || !canCreateContent}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload New Music
        </Button>
      </div>

      {/* Community Permissions Info */}
      {isModerator && !isOwner && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Moderator View
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              You can view all community music content but cannot create or edit
              tracks/albums. Only the community owner can manage music content.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Show upload restriction warning if user can't upload */}
      {!canUpload && <UploadRestrictionBannerCompact />}

      {/* Show forms when active - only if user can create content */}
      {showTrackForm && canCreateContent && (
        <TrackForm
          onCancel={() => setShowTrackForm(false)}
          onSuccess={() => setShowTrackForm(false)}
          artistId={artistId}
          communityId={selectedCommunityId}
        />
      )}

      {showAlbumForm && canCreateContent && (
        <AlbumForm
          onCancel={() => setShowAlbumForm(false)}
          onSuccess={() => setShowAlbumForm(false)}
          artistId={artistId}
          communityId={selectedCommunityId}
        />
      )}

      {editingAlbum && canEditContent(editingAlbum) && (
        <AlbumForm
          onCancel={() => setEditingAlbum(null)}
          onSuccess={() => setEditingAlbum(null)}
          artistId={artistId}
          album={editingAlbum}
          isEditing={true}
          communityId={selectedCommunityId}
        />
      )}

      {editingTrack && canEditContent(editingTrack) && (
        <TrackForm
          onCancel={() => setEditingTrack(null)}
          onSuccess={() => setEditingTrack(null)}
          artistId={artistId}
          track={editingTrack}
          isEditing={true}
          communityId={selectedCommunityId}
        />
      )}

      {editingDraftTrack && (
        <TrackForm
          onCancel={() => setEditingDraftTrack(null)}
          onSuccess={() => setEditingDraftTrack(null)}
          artistId={artistId}
          draft={editingDraftTrack}
        />
      )}

      {editingDraftAlbum && (
        <AlbumForm
          onCancel={() => setEditingDraftAlbum(null)}
          onSuccess={() => setEditingDraftAlbum(null)}
          artistId={artistId}
          draft={editingDraftAlbum}
        />
      )}

      {viewingTrack && (
        <TrackDetailsDialog
          track={viewingTrack}
          isOpen={!!viewingTrack}
          onClose={() => setViewingTrack(null)}
        />
      )}

      {/* Album Details Dialog */}
      {viewingAlbum && (
        <AlertDialog
          open={!!viewingAlbum}
          onOpenChange={() => setViewingAlbum(null)}
        >
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                Album Details
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              {/* Header Section - Always Full Width */}
              <div className="flex gap-4">
                {viewingAlbum.coverUrl && (
                  <img
                    src={viewingAlbum.coverUrl}
                    alt={viewingAlbum.title}
                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">
                    {viewingAlbum.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {viewingAlbum.artist}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{viewingAlbum.genre}</span>
                    {viewingAlbum.releaseDate && (
                      <span>
                        Released:{" "}
                        {new Date(
                          viewingAlbum.releaseDate
                        ).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      Published:{" "}
                      {new Date(
                        viewingAlbum.created_at * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout for larger screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Description */}
                  {viewingAlbum.description && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {viewingAlbum.description}
                      </p>
                    </div>
                  )}

                  {/* Tracks */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Tracks ({viewingAlbum.tracks.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {viewingAlbum.tracks.map((track, index) => (
                        <div
                          key={track.id}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="truncate flex-1 mr-2">
                            {index + 1}. {track.title}
                          </span>
                          <span className="text-muted-foreground text-xs flex-shrink-0">
                            {track.artist}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price and Tags */}
                  <div className="space-y-3">
                    {viewingAlbum.price && viewingAlbum.price > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Price</h4>
                        <p className="text-sm">
                          {formatCurrency(viewingAlbum.price)}
                        </p>
                      </div>
                    )}

                    {viewingAlbum.tags && viewingAlbum.tags.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Tags</h4>
                        <div className="flex flex-wrap gap-1">
                          {viewingAlbum.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Event ID Section */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Event ID
                    </h4>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {viewingAlbum.id}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyAlbumEventId(viewingAlbum)}
                        title="Copy full event ID"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Media & Links Section */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Links</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {viewingAlbum.coverUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="justify-start"
                        >
                          <a
                            href={viewingAlbum.coverUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Cover Art
                          </a>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAlbumNjump(viewingAlbum)}
                        className="justify-start"
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Open in Njump
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyAlbumNjumpLink(viewingAlbum)}
                        className="justify-start"
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copy Njump Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Event Viewer - Full Width */}
              <div className="space-y-2 min-w-0 w-full max-w-full overflow-hidden border-t pt-4">
                <Collapsible
                  open={isAlbumRawEventOpen}
                  onOpenChange={setIsAlbumRawEventOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 p-0 h-auto"
                    >
                      {isAlbumRawEventOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        View Raw Event
                      </span>
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
                        onClick={() => handleCopyAlbumRawEvent(viewingAlbum)}
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
                        className="text-xs bg-muted p-3 rounded border max-h-48 overflow-y-auto whitespace-pre-wrap break-words w-full"
                        style={{ maxWidth: "100%", wordBreak: "break-all" }}
                      >
                        <code
                          className="whitespace-pre-wrap break-words block"
                          style={{ maxWidth: "100%", wordBreak: "break-all" }}
                        >
                          {JSON.stringify(viewingAlbum.event, null, 2)}
                        </code>
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Tabs defaultValue="albums" className="space-y-6">
        <TabsList>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="uploads">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Draft Tracks */}
            <Card>
              <CardHeader>
                <CardTitle>Draft Tracks</CardTitle>
                <CardDescription>
                  Private encrypted tracks visible only to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {draftsLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Loading drafts...
                  </div>
                ) : draftTracks.length > 0 ? (
                  <div className="space-y-3">
                    {draftTracks.map((draft) => (
                      <div
                        key={draft.draftId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {draft.metadata.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Created:{" "}
                            {new Date(
                              draft.draftCreatedAt * 1000
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDraftTrack(draft)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => publishDraftTrack.mutateAsync({ draft, communityId: selectedCommunityId })}
                          >
                            Publish
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingDraftTrack(draft)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  publishDraftTrack.mutateAsync({ draft, communityId: selectedCommunityId })
                                }
                              >
                                Publish Track
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  deleteDraft.mutateAsync({
                                    draftId: draft.draftId,
                                    kind: 31337,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Draft
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No draft tracks found
                    <p className="text-sm mt-2">
                      Create a new track and save it as a draft to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Draft Albums */}
            <Card>
              <CardHeader>
                <CardTitle>Draft Albums</CardTitle>
                <CardDescription>
                  Private encrypted albums visible only to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {draftsLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Loading drafts...
                  </div>
                ) : draftAlbums.length > 0 ? (
                  <div className="space-y-3">
                    {draftAlbums.map((draft) => (
                      <div
                        key={draft.draftId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {draft.metadata.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {draft.metadata.artist}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {draft.metadata.tracks.length} tracks • Created:{" "}
                            {new Date(
                              draft.draftCreatedAt * 1000
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDraftAlbum(draft)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => publishDraftAlbum.mutateAsync({ draft, communityId: selectedCommunityId })}
                          >
                            Publish
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingDraftAlbum(draft)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  publishDraftAlbum.mutateAsync({ draft, communityId: selectedCommunityId })
                                }
                              >
                                Publish Album
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  deleteDraft.mutateAsync({
                                    draftId: draft.draftId,
                                    kind: 31338,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Draft
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No draft albums found
                    <p className="text-sm mt-2">
                      Create a new album and save it as a draft to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="albums" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums?.map((album, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="relative aspect-square">
                  <img
                    src={album.coverUrl || "/placeholder.svg"}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {canEditContent(album) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingAlbum(album)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setViewingAlbum(album)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold">{album.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {album.releaseDate
                      ? new Date(album.releaseDate).getFullYear()
                      : "Unknown"}{" "}
                    • {album.tracks.length} tracks
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    {canEditContent(album) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingAlbum(album)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setViewingAlbum(album)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canEditContent(album) && (
                          <DropdownMenuItem
                            onClick={() => setEditingAlbum(album)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Album
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            setUnpublishingContent({
                              type: "album",
                              content: album,
                            })
                          }
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Unpublish
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingAlbum(album)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Album
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Album Card */}
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-6 h-full min-h-[300px]">
              <Plus className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="font-medium text-muted-foreground">
                Create New Album
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Upload multiple tracks as an album
              </p>
              <Button className="mt-4" onClick={() => setShowAlbumForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Album
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tracks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>All Tracks</CardTitle>
                  {trackSearchQuery && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing {filteredTracks.length} of {allTracks.length}{" "}
                      tracks
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tracks..."
                      className="w-[200px] pl-8 pr-8"
                      value={trackSearchQuery}
                      onChange={(e) => setTrackSearchQuery(e.target.value)}
                    />
                    {trackSearchQuery && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setTrackSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Most Played</DropdownMenuItem>
                      <DropdownMenuItem>Most Revenue</DropdownMenuItem>
                      <DropdownMenuItem>Recently Added</DropdownMenuItem>
                      <DropdownMenuItem>Exclusive Only</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Track</TableHead>
                      <TableHead>Album</TableHead>
                      {/* <TableHead className="text-center">Exclusive</TableHead> */}
                      <TableHead className="text-right">Stream Cost</TableHead>
                      <TableHead className="text-right">Plays</TableHead>
                      <TableHead className="text-right">
                        Revenue (Nutzaps)
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTracks.length > 0 ? (
                      filteredTracks.map((track, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {track.title}
                          </TableCell>
                          <TableCell>{track.albumTitle}</TableCell>
                          {/* <TableCell className="text-center">
                            {track.exclusive ? (
                              <Star className="h-4 w-4 text-amber-500 inline" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell> */}
                          <TableCell className="text-right">
                            {formatCurrency(track.price)}
                          </TableCell>
                          <TableCell className="text-right">0</TableCell>
                          <TableCell className="text-right">
                            {nutzapsLoading ? (
                              <span className="text-muted-foreground">
                                Loading...
                              </span>
                            ) : (
                              <span
                                className={
                                  nutzapTotalMap.get(track.id)
                                    ? "text-green-600 font-medium"
                                    : ""
                                }
                              >
                                {formatCurrency(
                                  nutzapTotalMap.get(track.id) || 0
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canEditContent(track) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingTrack(track)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setViewingTrack(track)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {canEditContent(track) && (
                                    <DropdownMenuItem
                                      onClick={() => setEditingTrack(track)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Track
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      convertTrackToDraft.mutateAsync(track)
                                    }
                                  >
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Convert to Draft
                                  </DropdownMenuItem>
                                  {/* <DropdownMenuItem>
                                    <Star className="h-4 w-4 mr-2" />
                                    {track.exclusive
                                      ? "Remove Exclusive"
                                      : "Make Exclusive"}
                                  </DropdownMenuItem> */}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeletingTrack(track)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Track
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          {trackSearchQuery.trim()
                            ? `No tracks found matching "${trackSearchQuery}"`
                            : "No tracks found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>
                Recent music uploads and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadHistoryLoading || draftsLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          Loading upload history...
                        </TableCell>
                      </TableRow>
                    ) : combinedUploadHistory.length > 0 ? (
                      combinedUploadHistory.map((upload) => (
                        <TableRow key={upload.id}>
                          <TableCell>{upload.date}</TableCell>
                          <TableCell className="font-medium">
                            {upload.title}
                          </TableCell>
                          <TableCell>
                            {upload.type === "album"
                              ? `Album${
                                  upload.trackCount
                                    ? ` (${upload.trackCount} tracks)`
                                    : ""
                                }`
                              : "Single Track"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                upload.isDraft === true
                                  ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              }
                            >
                              {upload.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {upload.isDraft === true ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (upload.type === "track" && upload.draftData) {
                                      setEditingDraftTrack(
                                        upload.draftData as DraftTrack
                                      );
                                    } else if (upload.draftData) {
                                      setEditingDraftAlbum(
                                        upload.draftData as DraftAlbum
                                      );
                                    }
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    if (upload.type === "track" && upload.draftData) {
                                      publishDraftTrack.mutateAsync({
                                        draft: upload.draftData as DraftTrack,
                                        communityId: selectedCommunityId
                                      });
                                    } else if (upload.draftData) {
                                      publishDraftAlbum.mutateAsync({
                                        draft: upload.draftData as DraftAlbum,
                                        communityId: selectedCommunityId
                                      });
                                    }
                                  }}
                                >
                                  Publish
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {(() => {
                                  // Find the actual track/album object for permission checking
                                  const content =
                                    upload.type === "track"
                                      ? allTracks.find(
                                          (t) => t.id === upload.id
                                        )
                                      : albums.find((a) => a.id === upload.id);

                                  return content && canEditContent(content) ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        if (upload.type === "track") {
                                          setEditingTrack(
                                            content as NostrTrack
                                          );
                                        } else {
                                          setEditingAlbum(
                                            content as NostrAlbum
                                          );
                                        }
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  ) : null;
                                })()}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Show confirmation dialog before unpublishing
                                    if (upload.type === "track") {
                                      const track = allTracks.find(
                                        (t) => t.id === upload.id
                                      );
                                      if (track)
                                        setUnpublishingContent({
                                          type: "track",
                                          content: track,
                                        });
                                    } else {
                                      const album = albums.find(
                                        (a) => a.id === upload.id
                                      );
                                      if (album)
                                        setUnpublishingContent({
                                          type: "album",
                                          content: album,
                                        });
                                    }
                                  }}
                                >
                                  Unpublish
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setViewingTrack(
                                      upload.type === "track"
                                        ? allTracks.find(
                                            (t) => t.id === upload.id
                                          ) || null
                                        : null
                                    )
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          No upload history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Track Confirmation Dialog */}
      <AlertDialog
        open={!!deletingTrack}
        onOpenChange={() => setDeletingTrack(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTrack?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTrack && handleDeleteTrack(deletingTrack)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Track
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Album Confirmation Dialog */}
      <AlertDialog
        open={!!deletingAlbum}
        onOpenChange={() => setDeletingAlbum(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Album</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAlbum?.title}"? This
              will delete the album but not the individual tracks. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAlbum && handleDeleteAlbum(deletingAlbum)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpublish Content Confirmation Dialog */}
      <AlertDialog
        open={!!unpublishingContent}
        onOpenChange={() => setUnpublishingContent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unpublish{" "}
              {unpublishingContent?.type === "track" ? "Track" : "Album"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to unpublish "
                {unpublishingContent?.content.title}"?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important consequences:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your content will no longer be publicly available</li>
                      <li>
                        All social interactions (comments, reactions, zaps) will
                        be lost
                      </li>
                      <li>
                        If you republish later, it will have a new event ID
                      </li>
                      <li>Historical social activity cannot be restored</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The content will be converted to a private encrypted draft that
                only you can see.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (unpublishingContent) {
                  if (unpublishingContent.type === "track") {
                    convertTrackToDraft.mutateAsync(
                      unpublishingContent.content as NostrTrack
                    );
                  } else {
                    convertAlbumToDraft.mutateAsync(
                      unpublishingContent.content as NostrAlbum
                    );
                  }
                  setUnpublishingContent(null);
                }
              }}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Unpublish{" "}
              {unpublishingContent?.type === "track" ? "Track" : "Album"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
