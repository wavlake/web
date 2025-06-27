import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@/hooks/useNostr";
import { useContext } from "react";
import { CommunityContext } from "@/contexts/CommunityContext";
import { KINDS } from "@/lib/nostr-kinds";
import { parseTrackFromEvent, NostrTrack } from "@/types/music";
import { parseAlbumFromEvent, NostrAlbum } from "@/hooks/useArtistAlbums";
import { NostrEvent } from "@nostrify/nostrify";

// Filter types for nostr queries
interface NostrFilter {
  kinds?: number[];
  authors?: string[];
  limit?: number;
  since?: number;
  [key: `#${string}`]: string[] | undefined;
}

// Update timestamp after fetching events
function updateLastFetchTimestamp(key: string, events: NostrEvent[]): void {
  if (events.length === 0) return;

  const latestTimestamp = Math.max(...events.map((event) => event.created_at));
  localStorage.setItem(`nostr_last_fetch_${key}`, latestTimestamp.toString());
}

// Get last fetch timestamp
function getLastFetchTimestamp(key: string): number | undefined {
  const stored = localStorage.getItem(`nostr_last_fetch_${key}`);
  return stored ? parseInt(stored, 10) : undefined;
}

export interface CommunityContent {
  tracks: NostrTrack[];
  albums: NostrAlbum[];
  comments: NostrEvent[];
  reactions: NostrEvent[];
  zaps: NostrEvent[];
  lastFetch: number;
}

export interface UploadHistoryItem {
  id: string;
  date: string;
  title: string;
  type: "track" | "album";
  status: "published";
  event: NostrEvent;
  trackCount?: number;
}

/**
 * Consolidated hook that fetches all content (tracks and albums) for a community
 * Uses 'since' filtering for incremental loading
 */
export function useCommunityContent(communityId: string | null = null) {
  const { nostr } = useNostr();

  // Use the context directly without throwing if it's not available
  const context = useContext(CommunityContext);
  const selectedCommunity = context?.selectedCommunity ?? null;
  const selectedCommunityId = context?.selectedCommunityId ?? null;

  // Use provided communityId or fall back to selected community
  const targetCommunityId = communityId || selectedCommunityId;
  const targetCommunity = communityId ? null : selectedCommunity; // Only use selectedCommunity if no specific ID provided

  console.log(`[useCommunityContent] Hook called with:`, {
    communityId,
    selectedCommunityId,
    targetCommunityId,
    nostrAvailable: !!nostr,
    timestamp: new Date().toISOString()
  });

  return useQuery({
    queryKey: ["community-content", targetCommunityId],
    queryFn: async ({ signal }) => {
      console.log(`[useCommunityContent] QueryFn starting for:`, {
        targetCommunityId,
        signalAborted: signal.aborted,
        timestamp: new Date().toISOString()
      });
      if (!nostr || !targetCommunityId) {
        return {
          tracks: [] as NostrTrack[],
          albums: [] as NostrAlbum[],
          comments: [] as NostrEvent[],
          reactions: [] as NostrEvent[],
          zaps: [] as NostrEvent[],
          lastFetch: 0,
        };
      }

      // For provided communityId, we need to parse the community owner
      let communityOwner: string;
      if (communityId) {
        // Extract owner pubkey from communityId format: "34550:pubkey:d-identifier"
        const [, pubkey] = targetCommunityId.split(":");
        if (!pubkey) {
          throw new Error("Invalid community ID format");
        }
        communityOwner = pubkey;
      } else if (targetCommunity) {
        communityOwner = targetCommunity.pubkey;
      } else {
        throw new Error("No community selected");
      }

      // Get last fetch timestamp for incremental loading
      const cacheKey = `community-content-${targetCommunityId}`;
      const lastFetch = getLastFetchTimestamp(cacheKey);

      // Create filters with 'since' for incremental loading
      const trackFilter: NostrFilter = {
        kinds: [KINDS.MUSIC_TRACK],
        authors: [communityOwner],
        "#a": [targetCommunityId],
        limit: 200,
      };

      const albumFilter: NostrFilter = {
        kinds: [KINDS.MUSIC_ALBUM],
        authors: [communityOwner],
        "#a": [targetCommunityId],
        limit: 100,
      };

      // Activity filters (not limited to community owner)
      const commentFilter: NostrFilter = {
        kinds: [KINDS.GROUP_POST_REPLY],
        "#a": [targetCommunityId],
        limit: 50,
      };

      const reactionFilter: NostrFilter = {
        kinds: [KINDS.REACTION],
        "#a": [targetCommunityId],
        limit: 50,
      };

      const zapFilter: NostrFilter = {
        kinds: [9735], // Zap receipt
        "#a": [targetCommunityId],
        limit: 30,
      };

      // Add 'since' filter if we have a previous timestamp
      if (lastFetch) {
        trackFilter.since = lastFetch;
        albumFilter.since = lastFetch;
        commentFilter.since = lastFetch;
        reactionFilter.since = lastFetch;
        zapFilter.since = lastFetch;
        console.log(
          `[useCommunityContent] Using incremental fetch since: ${lastFetch} (${new Date(
            lastFetch * 1000
          ).toISOString()})`
        );
      } else {
        console.log(
          `[useCommunityContent] First-time fetch for community: ${targetCommunityId}`
        );
      }

      try {
        console.log(`[useCommunityContent] Starting 5 parallel nostr.query calls:`, {
          targetCommunityId,
          filters: {
            tracks: trackFilter,
            albums: albumFilter,
            comments: commentFilter,
            reactions: reactionFilter,
            zaps: zapFilter
          },
          timestamp: new Date().toISOString()
        });

        // Fetch all event types in parallel
        const [
          trackEvents,
          albumEvents,
          commentEvents,
          reactionEvents,
          zapEvents,
        ] = await Promise.all([
          nostr.query([trackFilter], { signal }),
          nostr.query([albumFilter], { signal }),
          nostr.query([commentFilter], { signal }),
          nostr.query([reactionFilter], { signal }),
          nostr.query([zapFilter], { signal }),
        ]);

        console.log(`[useCommunityContent] All nostr.query calls completed:`, {
          targetCommunityId,
          results: {
            trackEvents: trackEvents.length,
            albumEvents: albumEvents.length,
            commentEvents: commentEvents.length,
            reactionEvents: reactionEvents.length,
            zapEvents: zapEvents.length
          },
          timestamp: new Date().toISOString()
        });

        // Parse events into domain objects
        const tracks = trackEvents
          .map(parseTrackFromEvent)
          .filter((track): track is NostrTrack => track !== null)
          .sort((a, b) => b.created_at - a.created_at); // Sort by newest first

        const albums = albumEvents
          .map(parseAlbumFromEvent)
          .filter((album): album is NostrAlbum => album !== null)
          .sort((a, b) => b.created_at - a.created_at); // Sort by newest first

        // Update last fetch timestamp for incremental loading
        const allEvents = [
          ...trackEvents,
          ...albumEvents,
          ...commentEvents,
          ...reactionEvents,
          ...zapEvents,
        ];
        updateLastFetchTimestamp(cacheKey, allEvents);

        console.log(
          `[useCommunityContent] Fetched ${trackEvents.length} tracks, ${albumEvents.length} albums, ${commentEvents.length} comments, ${reactionEvents.length} reactions, ${zapEvents.length} zaps for community: ${targetCommunityId}`
        );
        if (lastFetch && allEvents.length === 0) {
          console.log(
            `[useCommunityContent] No new events since last fetch - data is up to date`
          );
        }

        return {
          tracks,
          albums,
          comments: commentEvents,
          reactions: reactionEvents,
          zaps: zapEvents,
          lastFetch:
            allEvents.length > 0
              ? Math.max(...allEvents.map((e) => e.created_at))
              : lastFetch || 0,
        };
      } catch (error) {
        console.error("Failed to fetch community content:", error);
        return {
          tracks: [] as NostrTrack[],
          albums: [] as NostrAlbum[],
          comments: [] as NostrEvent[],
          reactions: [] as NostrEvent[],
          zaps: [] as NostrEvent[],
          lastFetch: lastFetch || 0,
        };
      }
    },
    enabled: !!nostr && !!targetCommunityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to get just the tracks from community content
 */
export function useCommunityTracks(communityId: string | null = null) {
  const { data, ...rest } = useCommunityContent(communityId);
  return {
    data: data?.tracks || ([] as NostrTrack[]),
    ...rest,
  };
}

/**
 * Hook to get just the albums from community content
 */
export function useCommunityAlbums(communityId: string | null = null) {
  const { data, ...rest } = useCommunityContent(communityId);
  return {
    data: data?.albums || ([] as NostrAlbum[]),
    ...rest,
  };
}

/**
 * Hook to get upload history formatted from community content
 */
export function useCommunityUploadHistory(communityId: string | null = null) {
  const { data, ...rest } = useCommunityContent(communityId);

  const uploadHistory: UploadHistoryItem[] = [];

  if (data) {
    // Add tracks to upload history
    data.tracks.forEach((track) => {
      uploadHistory.push({
        id: track.id,
        date: new Date(track.created_at * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        title: track.title,
        type: "track",
        status: "published",
        event: track.event,
      });
    });

    // Add albums to upload history
    data.albums.forEach((album) => {
      uploadHistory.push({
        id: album.id,
        date: new Date(album.created_at * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        title: album.title,
        type: "album",
        status: "published",
        event: album.event,
        trackCount: album.tracks.length,
      });
    });

    // Sort by date (newest first)
    uploadHistory.sort((a, b) => {
      const dateA = new Date(a.event.created_at * 1000);
      const dateB = new Date(b.event.created_at * 1000);
      return dateB.getTime() - dateA.getTime();
    });
  }

  return {
    data: uploadHistory,
    ...rest,
  };
}

// Activity item interface (moved from useRecentCommunityActivity)
export interface ActivityItem {
  id: string;
  type: "track" | "album" | "comment" | "reaction" | "zap";
  title: string;
  description: string;
  timestamp: number;
  authorPubkey: string;
  eventId: string;
  icon?: string;
}

// Helper function to extract sats amount from bolt11 invoice
function extractSatsFromBolt11(bolt11: string): number | null {
  try {
    // This is a simplified extraction - in production you'd use a proper bolt11 decoder
    const match = bolt11.match(/lnbc(\d+)([munp])/);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const multiplier = match[2];

    const multipliers: Record<string, number> = {
      m: 0.001,
      u: 0.000001,
      n: 0.000000001,
      p: 0.000000000001,
    };

    const btc = amount * (multipliers[multiplier] || 1);
    return Math.round(btc * 100000000); // Convert to sats
  } catch {
    return null;
  }
}

/**
 * Hook to get recent community activity formatted from community content
 * This replaces useRecentCommunityActivity and uses the same data source
 */
export function useCommunityActivity(
  communityId: string | null = null,
  limit: number = 10
) {
  const { data, ...rest } = useCommunityContent(communityId);

  const activities: ActivityItem[] = [];

  if (data) {
    // Add tracks to activities
    data.tracks.forEach((track) => {
      activities.push({
        id: track.id,
        type: "track",
        title: "New track published",
        description: track.title,
        timestamp: track.created_at,
        authorPubkey: track.pubkey,
        eventId: track.id,
        icon: "🎵",
      });
    });

    // Add albums to activities
    data.albums.forEach((album) => {
      activities.push({
        id: album.id,
        type: "album",
        title: "New album published",
        description: album.title,
        timestamp: album.created_at,
        authorPubkey: album.pubkey,
        eventId: album.id,
        icon: "💿",
      });
    });

    // Add comments to activities
    data.comments?.forEach((event) => {
      const preview =
        event.content.slice(0, 50) + (event.content.length > 50 ? "..." : "");
      activities.push({
        id: event.id,
        type: "comment",
        title: "New comment",
        description: preview,
        timestamp: event.created_at,
        authorPubkey: event.pubkey,
        eventId: event.id,
        icon: "💬",
      });
    });

    // Add reactions to activities
    data.reactions?.forEach((event) => {
      const reaction = event.content || "+";
      activities.push({
        id: event.id,
        type: "reaction",
        title: "New reaction",
        description: `Reacted with ${reaction}`,
        timestamp: event.created_at,
        authorPubkey: event.pubkey,
        eventId: event.id,
        icon: reaction === "+" ? "❤️" : reaction,
      });
    });

    // Add zaps to activities
    data.zaps?.forEach((event) => {
      // Extract amount from bolt11 tag
      const bolt11Tag = event.tags.find((tag) => tag[0] === "bolt11");
      const amount = bolt11Tag ? extractSatsFromBolt11(bolt11Tag[1]) : null;

      activities.push({
        id: event.id,
        type: "zap",
        title: "New zap received",
        description: amount ? `${amount} sats` : "Lightning payment",
        timestamp: event.created_at,
        authorPubkey: event.pubkey,
        eventId: event.id,
        icon: "⚡",
      });
    });

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
  }

  return {
    data: activities.slice(0, limit),
    ...rest,
  };
}
