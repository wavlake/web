import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { 
  DraftTrack, 
  DraftAlbum, 
  DRAFT_TRACK_KIND,
  DRAFT_ALBUM_KIND, 
  TRACK_KIND, 
  ALBUM_KIND 
} from "@/types/drafts";
import { parseDraftTrack, parseDraftAlbum } from "@/lib/draftUtils";

// Hook to fetch all draft tracks for the current user
export function useDraftTracks() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["draft-tracks", user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user?.pubkey || !user?.signer) return [];

      try {
        // Query kind 31339 events (draft tracks)
        const events = await nostr.query(
          [
            {
              kinds: [DRAFT_TRACK_KIND],
              authors: [user.pubkey],
              limit: 100,
            },
          ],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
        );

        // Decrypt and parse each draft
        const draftTracks: DraftTrack[] = [];
        
        for (const event of events) {
          try {
            if (!user.signer.nip44) {
              console.error("NIP-44 encryption not supported by current signer");
              continue;
            }
            const draftTrack = await parseDraftTrack(event, user.signer as any, user.pubkey);
            if (draftTrack) {
              draftTracks.push(draftTrack);
            }
          } catch (error) {
            console.error("Failed to parse draft track:", error);
            // Continue with other drafts if one fails
          }
        }

        // Sort by created date (newest first)
        return draftTracks.sort((a, b) => b.draftCreatedAt - a.draftCreatedAt);
      } catch (error) {
        console.error("Failed to fetch draft tracks:", error);
        return [];
      }
    },
    enabled: !!user?.pubkey && !!user?.signer,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Hook to fetch all draft albums for the current user
export function useDraftAlbums() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["draft-albums", user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user?.pubkey || !user?.signer) return [];

      try {
        // Query kind 31340 events (draft albums)
        const events = await nostr.query(
          [
            {
              kinds: [DRAFT_ALBUM_KIND],
              authors: [user.pubkey],
              limit: 100,
            },
          ],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) }
        );

        // Decrypt and parse each draft
        const draftAlbums: DraftAlbum[] = [];
        
        for (const event of events) {
          try {
            if (!user.signer.nip44) {
              console.error("NIP-44 encryption not supported by current signer");
              continue;
            }
            const draftAlbum = await parseDraftAlbum(event, user.signer as any, user.pubkey);
            if (draftAlbum) {
              draftAlbums.push(draftAlbum);
            }
          } catch (error) {
            console.error("Failed to parse draft album:", error);
            // Continue with other drafts if one fails
          }
        }

        // Sort by created date (newest first)
        return draftAlbums.sort((a, b) => b.draftCreatedAt - a.draftCreatedAt);
      } catch (error) {
        console.error("Failed to fetch draft albums:", error);
        return [];
      }
    },
    enabled: !!user?.pubkey && !!user?.signer,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Hook to fetch both draft tracks and albums
export function useAllDrafts() {
  const draftTracks = useDraftTracks();
  const draftAlbums = useDraftAlbums();

  return {
    tracks: draftTracks.data || [],
    albums: draftAlbums.data || [],
    isLoading: draftTracks.isLoading || draftAlbums.isLoading,
    isError: draftTracks.isError || draftAlbums.isError,
    error: draftTracks.error || draftAlbums.error,
    refetch: () => {
      draftTracks.refetch();
      draftAlbums.refetch();
    },
  };
}