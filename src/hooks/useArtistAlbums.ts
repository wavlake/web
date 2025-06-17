import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { KINDS } from "@/lib/nostr-kinds";
import { NostrEvent } from "@nostrify/nostrify";
import { useArtistTracks, NostrTrack } from "./useArtistTracks";

export interface NostrAlbum {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  releaseDate?: string;
  description?: string;
  genre?: string;
  explicit?: boolean;
  price?: number;
  tags?: string[];
  tracks: NostrTrack[];
  upc?: string;
  label?: string;
  pubkey: string;
  created_at: number;
  event: NostrEvent;
}

function parseAlbumFromEvent(
  event: NostrEvent
): Omit<NostrAlbum, "tracks"> | null {
  try {
    // Extract metadata from tags (content is plain text description)
    const titleTag = event.tags.find((tag) => tag[0] === "title")?.[1];
    const artistTag = event.tags.find((tag) => tag[0] === "artist")?.[1];
    const genreTag = event.tags.find((tag) => tag[0] === "genre")?.[1];

    // Cover art from image tag
    const coverUrl = event.tags.find((tag) => tag[0] === "image")?.[1];

    // Other metadata from tags
    const explicitTag = event.tags.find((tag) => tag[0] === "explicit")?.[1];
    const releasedAtTag = event.tags.find(
      (tag) => tag[0] === "released_at"
    )?.[1];
    const priceTag = event.tags.find((tag) => tag[0] === "price")?.[1];
    const upcTag = event.tags.find((tag) => tag[0] === "upc")?.[1];
    const labelTag = event.tags.find((tag) => tag[0] === "label")?.[1];

    // Get tags with 't' prefix
    const hashTags = event.tags
      .filter((tag) => tag[0] === "t")
      .map((tag) => tag[1]);

    return {
      id: event.id,
      title: titleTag || "Untitled Album",
      artist: artistTag || "Unknown Artist",
      coverUrl,
      releaseDate: releasedAtTag
        ? new Date(parseInt(releasedAtTag)).toISOString()
        : undefined,
      description: event.content || "", // Content is the description
      genre: genreTag,
      explicit: explicitTag === "true",
      price: priceTag ? parseInt(priceTag) : 0,
      tags: hashTags,
      upc: upcTag,
      label: labelTag,
      pubkey: event.pubkey,
      created_at: event.created_at,
      event,
    };
  } catch (error) {
    console.error("Failed to parse album event:", error);
    return null;
  }
}

export function useArtistAlbums(artistPubkey: string) {
  const { nostr } = useNostr();
  const { data: allTracks = [] } = useArtistTracks(artistPubkey);

  return useQuery({
    queryKey: ["artist-albums-real", artistPubkey],
    queryFn: async ({ signal }) => {
      if (!artistPubkey) return [];

      try {
        const events = await nostr.query(
          [
            {
              kinds: [KINDS.MUSIC_ALBUM],
              authors: [artistPubkey],
              limit: 50,
            },
          ],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }
        );

        const albums = events
          .map(parseAlbumFromEvent)
          .filter(
            (album): album is Omit<NostrAlbum, "tracks"> => album !== null
          )
          .map((album) => {
            // Find tracks that belong to this album
            const albumTracks = allTracks
              .filter(
                (track) =>
                  track.albumTitle?.toLowerCase() === album.title.toLowerCase()
              )
              .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

            return {
              ...album,
              tracks: albumTracks,
            } as NostrAlbum;
          })
          .sort((a, b) => b.created_at - a.created_at); // Sort by newest first

        return albums;
      } catch (error) {
        console.error("Failed to fetch artist albums:", error);
        return [];
      }
    },
    enabled: !!artistPubkey && allTracks.length >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
