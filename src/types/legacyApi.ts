// Legacy API TypeScript Interfaces
// This file contains TypeScript interfaces for the legacy API endpoints that provide access to PostgreSQL data.

// Common types used across multiple endpoints
export interface User {
  id: string;
  name: string;
  lightning_address: string;
  msat_balance: number;
  amp_msat: number;
  artwork_url: string;
  profile_url: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  user_id: string;
  name: string;
  artwork_url: string;
  artist_url: string;
  bio: string;
  twitter: string;
  instagram: string;
  youtube: string;
  website: string;
  npub: string;
  verified: boolean;
  deleted: boolean;
  msat_total: number;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  artist_id: string;
  title: string;
  artwork_url: string;
  description: string;
  genre_id: number;
  subgenre_id: number;
  is_draft: boolean;
  is_single: boolean;
  deleted: boolean;
  msat_total: number;
  is_feed_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  artist_id: string;
  album_id: string;
  title: string;
  order: number;
  play_count: number;
  msat_total: number;
  live_url: string;
  raw_url: string;
  size: number;
  duration: number;
  is_processing: boolean;
  is_draft: boolean;
  is_explicit: boolean;
  compressor_error: boolean;
  deleted: boolean;
  lyrics: string;
  created_at: string;
  updated_at: string;
  published_at: string;
}

// Endpoint Response Types

export interface LegacyMetadataResponse {
  user: User;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
}

export interface LegacyTracksResponse {
  tracks: Track[];
}

export interface LegacyArtistsResponse {
  artists: Artist[];
}

export interface LegacyAlbumsResponse {
  albums: Album[];
}

export interface LegacyArtistTracksResponse {
  tracks: Track[];
}

export interface LegacyAlbumTracksResponse {
  tracks: Track[];
}

export interface ErrorResponse {
  error: string;
}