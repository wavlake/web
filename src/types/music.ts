import { NostrEvent } from "@nostrify/nostrify";

export interface NostrTrack {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  subgenre?: string;
  duration?: number;
  audioUrl?: string;
  coverUrl?: string;
  description?: string;
  explicit?: boolean;
  price?: number;
  tags?: string[];
  releaseDate?: string;
  albumTitle?: string;
  trackNumber?: number;
  pubkey: string;
  created_at: number;
  event: NostrEvent;
}

export function parseTrackFromEvent(event: NostrEvent): NostrTrack | null {
  try {
    // Extract metadata from tags (content is plain text description)
    const titleTag = event.tags.find(tag => tag[0] === "title")?.[1];
    const artistTag = event.tags.find(tag => tag[0] === "artist")?.[1];
    const genreTag = event.tags.find(tag => tag[0] === "genre")?.[1];
    const subgenreTag = event.tags.find(tag => tag[0] === "subgenre")?.[1];
    
    // URL tags for audio and cover art
    const audioUrl = event.tags.find(tag => tag[0] === "url")?.[1];
    const coverUrl = event.tags.find(tag => tag[0] === "image")?.[1];
    
    // Other metadata from tags
    const explicitTag = event.tags.find(tag => tag[0] === "explicit")?.[1];
    const albumTag = event.tags.find(tag => tag[0] === "album")?.[1];
    const releasedAtTag = event.tags.find(tag => tag[0] === "released_at")?.[1];
    const trackNumberTag = event.tags.find(tag => tag[0] === "track")?.[1];
    const priceTag = event.tags.find(tag => tag[0] === "price")?.[1];
    const durationTag = event.tags.find(tag => tag[0] === "duration")?.[1];
    
    // Get tags with 't' prefix
    const hashTags = event.tags.filter(tag => tag[0] === "t").map(tag => tag[1]);
    
    return {
      id: event.id,
      title: titleTag || "Untitled Track",
      artist: artistTag || "Unknown Artist",
      genre: genreTag,
      subgenre: subgenreTag,
      duration: durationTag ? parseInt(durationTag) : 0,
      audioUrl,
      coverUrl,
      description: event.content || "", // Content is the description
      explicit: explicitTag === "true",
      price: priceTag ? parseInt(priceTag) : 0,
      tags: hashTags,
      releaseDate: releasedAtTag ? new Date(parseInt(releasedAtTag)).toISOString() : undefined,
      albumTitle: albumTag,
      trackNumber: trackNumberTag ? parseInt(trackNumberTag) : undefined,
      pubkey: event.pubkey,
      created_at: event.created_at,
      event,
    };
  } catch (error) {
    console.error("Failed to parse track event:", error);
    return null;
  }
}