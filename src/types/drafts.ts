import { NostrEvent } from "@nostrify/nostrify";

// Draft Events for Wavlake Music Platform
// Uses dedicated event kinds to avoid conflicts:
// - Kind 31339: Draft tracks (encrypted)
// - Kind 31340: Draft albums (encrypted)
// Content is encrypted using NIP-44 and only visible to the author

// Draft Track Event (kind 31339)
export interface DraftTrackEvent extends NostrEvent {
  kind: 31339;
  content: string; // encrypted JSON payload
  tags: [string, string][];
}

// Draft Album Event (kind 31340)
export interface DraftAlbumEvent extends NostrEvent {
  kind: 31340;
  content: string; // encrypted JSON payload
  tags: [string, string][];
}

// Draft Track - decrypted content structure
export interface DraftTrack {
  draftId: string;
  draftEventId: string;
  draftCreatedAt: number;
  draftUpdatedAt: number;
  title: string;
  // Future published event structure (kind 31337)
  futureEvent: {
    kind: 31337;
    content: string;
    tags: [string, string][];
  };
  // Extracted metadata for easy access
  metadata: {
    title: string;
    genre?: string;
    audioUrl?: string;
    coverUrl?: string;
    description?: string;
    explicit?: boolean;
    price?: number;
    tags?: string[];
  };
}

// Draft Album - decrypted content structure
export interface DraftAlbum {
  draftId: string;
  draftEventId: string;
  draftCreatedAt: number;
  draftUpdatedAt: number;
  title: string;
  // Future published event structure (kind 31338)
  futureEvent: {
    kind: 31338;
    content: string;
    tags: [string, string][];
  };
  // Extracted metadata for easy access
  metadata: {
    title: string;
    artist: string;
    genre?: string;
    description?: string;
    coverUrl?: string;
    explicit?: boolean;
    price?: number;
    tags?: string[];
    releaseDate?: string;
    upc?: string;
    label?: string;
    tracks: Array<{
      eventId: string;
      title: string;
      trackNumber: number;
    }>;
  };
}

// Draft creation data
export interface CreateDraftTrackData {
  title: string;
  description?: string;
  genre: string;
  explicit: boolean;
  price?: number;
  audioUrl: string;
  coverUrl?: string;
  tags: string[];
  artistId?: string;
  draftId?: string; // for updating existing drafts
}

export interface CreateDraftAlbumData {
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
  draftId?: string; // for updating existing drafts
}

// Draft event kinds - using separate kinds to avoid conflicts
export const DRAFT_TRACK_KIND = 31339; // Draft track events
export const DRAFT_ALBUM_KIND = 31340; // Draft album events
export const TRACK_KIND = 31337; // Music tracks
export const ALBUM_KIND = 31338; // Music albums

// TODO - update event kinds
// * 30440: Music Tracks
// * 30442: Music track draft
// * 30441: Music Collections/Albums
// * 30443: Music collection/album draft
