import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@/hooks/useNostr";
import { useCommunityContext } from "@/contexts/CommunityContext";
import { useContext } from "react";
import { CommunityContext } from "@/contexts/CommunityContext";
import { KINDS } from "@/lib/nostr-kinds";
import { getLastEventTimestamp } from "@/lib/nostrTimestamps";
import { parseTrackFromEvent, NostrTrack } from "@/types/music";
import { parseAlbumFromEvent, NostrAlbum } from "@/hooks/useArtistAlbums";
import { NostrEvent } from "@nostrify/nostrify";

// Update timestamp after fetching events
function updateLastFetchTimestamp(key: string, events: NostrEvent[]): void {
  if (events.length === 0) return;
  
  const latestTimestamp = Math.max(...events.map(event => event.created_at));
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
  lastFetch: number;
}

export interface UploadHistoryItem {
  id: string;
  date: string;
  title: string;
  type: 'track' | 'album';
  status: 'published';
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

  return useQuery({
    queryKey: ['community-content', targetCommunityId],
    queryFn: async ({ signal }) => {
      if (!nostr || !targetCommunityId) {
        return { tracks: [], albums: [], lastFetch: 0 };
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
      const trackFilter = {
        kinds: [KINDS.MUSIC_TRACK],
        authors: [communityOwner],
        "#a": [targetCommunityId],
        limit: 200
      };

      const albumFilter = {
        kinds: [KINDS.MUSIC_ALBUM],
        authors: [communityOwner],
        "#a": [targetCommunityId],
        limit: 100
      };

      // Add 'since' filter if we have a previous timestamp
      if (lastFetch) {
        Object.assign(trackFilter, { since: lastFetch });
        Object.assign(albumFilter, { since: lastFetch });
        console.log(`[useCommunityContent] Using incremental fetch since: ${lastFetch} (${new Date(lastFetch * 1000).toISOString()})`);
      } else {
        console.log(`[useCommunityContent] First-time fetch for community: ${targetCommunityId}`);
      }

      try {
        // Fetch tracks and albums in parallel
        const [trackEvents, albumEvents] = await Promise.all([
          nostr.query([trackFilter], { signal }),
          nostr.query([albumFilter], { signal })
        ]);

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
        const allEvents = [...trackEvents, ...albumEvents];
        updateLastFetchTimestamp(cacheKey, allEvents);

        console.log(`[useCommunityContent] Fetched ${trackEvents.length} tracks, ${albumEvents.length} albums for community: ${targetCommunityId}`);
        if (lastFetch && allEvents.length === 0) {
          console.log(`[useCommunityContent] No new events since last fetch - data is up to date`);
        }

        return {
          tracks,
          albums,
          lastFetch: allEvents.length > 0 ? Math.max(...allEvents.map(e => e.created_at)) : lastFetch || 0
        };
      } catch (error) {
        console.error("Failed to fetch community content:", error);
        return { tracks: [], albums: [], lastFetch: lastFetch || 0 };
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
    data: data?.tracks || [],
    ...rest
  };
}

/**
 * Hook to get just the albums from community content
 */
export function useCommunityAlbums(communityId: string | null = null) {
  const { data, ...rest } = useCommunityContent(communityId);
  return {
    data: data?.albums || [],
    ...rest
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
    data.tracks.forEach(track => {
      uploadHistory.push({
        id: track.id,
        date: new Date(track.created_at * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        title: track.title,
        type: 'track',
        status: 'published',
        event: track.event,
      });
    });

    // Add albums to upload history
    data.albums.forEach(album => {
      uploadHistory.push({
        id: album.id,
        date: new Date(album.created_at * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        title: album.title,
        type: 'album',
        status: 'published',
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
    ...rest
  };
}