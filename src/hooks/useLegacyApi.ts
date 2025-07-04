import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createNip98AuthHeader } from "@/lib/nip98Auth";
import type {
  LegacyMetadataResponse,
  LegacyTracksResponse,
  LegacyArtistsResponse,
  LegacyAlbumsResponse,
  LegacyArtistTracksResponse,
  LegacyAlbumTracksResponse,
} from "@/types/legacyApi";

// Base API URL for the new API
const API_BASE_URL =
  import.meta.env.VITE_NEW_API_URL || "http://localhost:8082/v1";

/**
 * Helper function to make authenticated requests to legacy API using NIP-98
 */
async function fetchLegacyApi<T>(endpoint: string, signer: any): Promise<T> {
  if (!signer) {
    throw new Error("No Nostr signer available");
  }

  const url = `${API_BASE_URL}/legacy${endpoint}`;
  const method = "GET";

  // Create NIP-98 auth header
  const authHeader = await createNip98AuthHeader(url, method, {}, signer);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Legacy API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Hook to fetch complete user metadata including artists, albums, and tracks
 */
export function useLegacyMetadata() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["legacy-metadata", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyMetadataResponse>("/metadata", user?.signer),
    enabled: !!user?.signer,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch all user tracks
 */
export function useLegacyTracks() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["legacy-tracks", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyTracksResponse>("/tracks", user?.signer),
    enabled: !!user?.signer,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch all user artists
 */
export function useLegacyArtists() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["legacy-artists", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyArtistsResponse>("/artists", user?.signer),
    enabled: !!user?.signer,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch all user albums
 */
export function useLegacyAlbums() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["legacy-albums", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyAlbumsResponse>("/albums", user?.signer),
    enabled: !!user?.signer,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch tracks for a specific artist
 */
export function useLegacyArtistTracks(artistId: string | undefined) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["legacy-artist-tracks", user?.pubkey, artistId],
    queryFn: () =>
      fetchLegacyApi<LegacyArtistTracksResponse>(
        `/artists/${artistId}/tracks`,
        user?.signer
      ),
    enabled: !!user?.signer && !!artistId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch tracks for a specific album
 */
export function useLegacyAlbumTracks(albumId: string | undefined) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["legacy-album-tracks", user?.pubkey, albumId],
    queryFn: () =>
      fetchLegacyApi<LegacyAlbumTracksResponse>(
        `/albums/${albumId}/tracks`,
        user?.signer
      ),
    enabled: !!user?.signer && !!albumId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
