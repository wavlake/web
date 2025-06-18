import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { KINDS } from "@/lib/nostr-kinds";
import { NostrEvent } from "@nostrify/nostrify";

interface TrackData {
  title: string;
  artist: string;
  description?: string;
  genre: string;
  duration?: number;
  explicit: boolean;
  price?: number;
  audioUrl: string;
  coverUrl?: string;
  tags: string[];
  releaseDate?: string;
  albumTitle?: string;
  trackNumber?: number;
  artistId?: string;
  // For editing existing tracks
  existingTrackId?: string;
  existingEvent?: NostrEvent;
}

interface AlbumData {
  title: string;
  artist: string;
  description?: string;
  genre: string;
  releaseDate?: string;
  price?: number;
  coverUrl?: string;
  tags: string[];
  upc?: string;
  label?: string;
  explicit: boolean;
  tracks: Array<{
    eventId: string;
    title: string;
    trackNumber: number;
  }>;
  artistId?: string;
  // For editing existing albums
  existingAlbumId?: string;
  existingEvent?: NostrEvent;
}

export function useMusicPublish() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const publishTrack = useMutation({
    mutationFn: async (trackData: TrackData) => {
      if (!user) throw new Error("User not logged in");

      // Use existing identifier for editing, or create new one for new tracks
      let identifier: string;
      if (trackData.existingEvent) {
        // Extract identifier from existing event's 'd' tag
        const dTag = trackData.existingEvent.tags.find((tag: string[]) => tag[0] === "d");
        identifier = dTag ? dTag[1] : `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } else {
        // Create new identifier for new tracks
        identifier = `track-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      // Build tags for the track event
      const tags = [
        ["d", identifier], // identifier tag for replaceable events
        ["title", trackData.title],
        ["artist", trackData.artist],
        ["genre", trackData.genre],
        ["url", trackData.audioUrl], // audio file URL
        ["explicit", trackData.explicit.toString()],
      ];

      // Add optional tags
      if (trackData.description) {
        tags.push(["description", trackData.description]);
      }

      if (trackData.duration) {
        tags.push(["duration", trackData.duration.toString()]);
      }

      if (trackData.price && trackData.price > 0) {
        tags.push(["price", trackData.price.toString(), "sat"]);
      }

      if (trackData.coverUrl) {
        tags.push(["image", trackData.coverUrl]);
      }

      if (trackData.releaseDate) {
        tags.push([
          "released_at",
          new Date(trackData.releaseDate).getTime().toString(),
        ]);
      }

      if (trackData.albumTitle) {
        tags.push(["album", trackData.albumTitle]);
      }

      if (trackData.trackNumber) {
        tags.push(["track", trackData.trackNumber.toString()]);
      }

      // Add custom tags
      trackData.tags.forEach((tag) => {
        tags.push(["t", tag]);
      });

      // Add artist reference if provided
      if (trackData.artistId) {
        tags.push(["p", trackData.artistId]);
      }

      const event = {
        kind: KINDS.MUSIC_TRACK,
        content: trackData.description || "",
        tags,
      };

      return await publishEvent(event);
    },
    onSuccess: () => {
      // Invalidate artist albums query to refresh the music list
      queryClient.invalidateQueries({ queryKey: ["artist-albums"] });
    },
  });

  const publishAlbum = useMutation({
    mutationFn: async (albumData: AlbumData) => {
      if (!user) throw new Error("User not logged in");

      // Use existing identifier for editing, or create new one for new albums
      let identifier: string;
      if (albumData.existingEvent) {
        // Extract identifier from existing event's 'd' tag
        const dTag = albumData.existingEvent.tags.find((tag: string[]) => tag[0] === "d");
        identifier = dTag ? dTag[1] : `album-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } else {
        // Create new identifier for new albums
        identifier = `album-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      // Build tags for the album event
      const tags = [
        ["d", identifier], // identifier tag for replaceable events
        ["title", albumData.title],
        ["artist", albumData.artist],
        ["genre", albumData.genre],
        ["explicit", albumData.explicit.toString()],
      ];

      // Add optional album metadata
      if (albumData.description) {
        tags.push(["description", albumData.description]);
      }

      if (albumData.price && albumData.price > 0) {
        tags.push(["price", albumData.price.toString(), "sat"]);
      }

      if (albumData.coverUrl) {
        tags.push(["image", albumData.coverUrl]);
      }

      if (albumData.releaseDate) {
        tags.push([
          "released_at",
          new Date(albumData.releaseDate).getTime().toString(),
        ]);
      }

      if (albumData.upc) {
        tags.push(["upc", albumData.upc]);
      }

      if (albumData.label) {
        tags.push(["label", albumData.label]);
      }

      // Add track references (e tags reference the track events)
      albumData.tracks
        .sort((a, b) => a.trackNumber - b.trackNumber)
        .forEach((track) => {
          tags.push(["e", track.eventId, "", track.title]);
          tags.push(["track", track.trackNumber.toString(), track.eventId]);
        });

      // Add custom tags
      albumData.tags.forEach((tag) => {
        tags.push(["t", tag]);
      });

      // Add artist reference if provided
      if (albumData.artistId) {
        tags.push(["p", albumData.artistId]);
      }

      const event = {
        kind: KINDS.MUSIC_ALBUM,
        content: albumData.description || "",
        tags,
      };

      return await publishEvent(event);
    },
    onSuccess: () => {
      // Invalidate artist albums query to refresh the music list
      queryClient.invalidateQueries({ queryKey: ["artist-albums"] });
    },
  });

  return {
    mutate: (
      data: TrackData | AlbumData,
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      // Determine if it's a track or album based on the presence of tracks array
      if ("tracks" in data) {
        return publishAlbum.mutate(data as AlbumData, options);
      } else {
        return publishTrack.mutate(data as TrackData, options);
      }
    },
    mutateAsync: async (data: TrackData | AlbumData) => {
      if ("tracks" in data) {
        return await publishAlbum.mutateAsync(data as AlbumData);
      } else {
        return await publishTrack.mutateAsync(data as TrackData);
      }
    },
    isPending: publishTrack.isPending || publishAlbum.isPending,
    isError: publishTrack.isError || publishAlbum.isError,
    error: publishTrack.error || publishAlbum.error,
  };
}
