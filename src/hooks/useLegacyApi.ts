import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { createNip98AuthHeader } from "@/lib/nip98Auth";
import type { NostrEvent } from "@nostrify/nostrify";
import type {
  LegacyMetadataResponse,
  LegacyTracksResponse,
  LegacyArtistsResponse,
  LegacyAlbumsResponse,
  LegacyArtistTracksResponse,
  LegacyAlbumTracksResponse,
} from "@/types/legacyApi";

// Type for Nostr signer with NIP-44 support
interface NostrSigner {
  getPublicKey: () => Promise<string>;
  signEvent: (event: NostrEvent) => Promise<NostrEvent>;
  nip44?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string>;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
  };
}

// Base API URL for the new API
const API_BASE_URL =
  import.meta.env.VITE_NEW_API_URL || "http://localhost:8082/v1";

/**
 * Helper function to make authenticated requests to legacy API using Firebase token OR NIP-98
 * Prefers Firebase auth token if available, falls back to NIP-98
 */
async function fetchLegacyApi<T>(
  endpoint: string, 
  signer: unknown, 
  getAuthToken?: () => Promise<string | null>
): Promise<T> {
  const url = `${API_BASE_URL}/legacy${endpoint}`;
  const method = "GET";
  
  let authHeader: string;
  
  // Try Firebase auth token first (preferred)
  if (getAuthToken) {
    try {
      const firebaseToken = await getAuthToken();
      if (firebaseToken) {
        authHeader = `Bearer ${firebaseToken}`;
      } else {
        throw new Error("Firebase token not available");
      }
    } catch (error) {
      // Fall back to NIP-98 if Firebase auth fails
      if (!signer) {
        throw new Error("No Firebase token or Nostr signer available");
      }
      authHeader = await createNip98AuthHeader(url, method, {}, signer);
    }
  } else {
    // No Firebase auth available, use NIP-98
    if (!signer) {
      throw new Error("No Nostr signer available");
    }
    authHeader = await createNip98AuthHeader(url, method, {}, signer);
  }

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
  const { getAuthToken } = useFirebaseAuth();

  return useQuery({
    queryKey: ["legacy-metadata", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyMetadataResponse>("/metadata", user?.signer, getAuthToken),
    enabled: !!user?.signer || !!getAuthToken,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch all user tracks
 */
export function useLegacyTracks() {
  const { user } = useCurrentUser();
  const { getAuthToken } = useFirebaseAuth();

  return useQuery({
    queryKey: ["legacy-tracks", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyTracksResponse>("/tracks", user?.signer, getAuthToken),
    enabled: !!user?.signer || !!getAuthToken,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch all user artists
 */
export function useLegacyArtists() {
  const { user } = useCurrentUser();
  const { getAuthToken } = useFirebaseAuth();

  return useQuery({
    queryKey: ["legacy-artists", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyArtistsResponse>("/artists", user?.signer, getAuthToken),
    enabled: !!user?.signer || !!getAuthToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook to fetch all user albums
 */
export function useLegacyAlbums() {
  const { user } = useCurrentUser();
  const { getAuthToken } = useFirebaseAuth();

  return useQuery({
    queryKey: ["legacy-albums", user?.pubkey],
    queryFn: () =>
      fetchLegacyApi<LegacyAlbumsResponse>("/albums", user?.signer, getAuthToken),
    enabled: !!user?.signer || !!getAuthToken,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch tracks for a specific artist
 */
export function useLegacyArtistTracks(artistId: string | undefined) {
  const { user } = useCurrentUser();
  const { getAuthToken } = useFirebaseAuth();

  return useQuery({
    queryKey: ["legacy-artist-tracks", user?.pubkey, artistId],
    queryFn: () =>
      fetchLegacyApi<LegacyArtistTracksResponse>(
        `/artists/${artistId}/tracks`,
        user?.signer,
        getAuthToken
      ),
    enabled: (!!user?.signer || !!getAuthToken) && !!artistId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch tracks for a specific album
 */
export function useLegacyAlbumTracks(albumId: string | undefined) {
  const { user } = useCurrentUser();
  const { getAuthToken } = useFirebaseAuth();

  return useQuery({
    queryKey: ["legacy-album-tracks", user?.pubkey, albumId],
    queryFn: () =>
      fetchLegacyApi<LegacyAlbumTracksResponse>(
        `/albums/${albumId}/tracks`,
        user?.signer,
        getAuthToken
      ),
    enabled: (!!user?.signer || !!getAuthToken) && !!albumId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
