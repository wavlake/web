import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { KINDS } from "@/lib/nostr-kinds";
import { NostrEvent } from "@nostrify/nostrify";

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
 * Hook to fetch user's upload history (tracks and albums)
 */
export function useUploadHistory() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["upload-history", user?.pubkey],
    queryFn: async (c) => {
      if (!nostr || !user) {
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Fetch both tracks and albums
      const [trackEvents, albumEvents] = await Promise.all([
        nostr.query(
          [{ kinds: [KINDS.MUSIC_TRACK], authors: [user.pubkey], limit: 100 }],
          { signal }
        ),
        nostr.query(
          [{ kinds: [KINDS.MUSIC_ALBUM], authors: [user.pubkey], limit: 100 }],
          { signal }
        ),
      ]);

      const uploadHistory: UploadHistoryItem[] = [];

      // Process tracks
      for (const event of trackEvents) {
        const titleTag = event.tags.find(tag => tag[0] === "title")?.[1];
        const title = titleTag || "Untitled Track";

        uploadHistory.push({
          id: event.id,
          date: new Date(event.created_at * 1000).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          title,
          type: 'track',
          status: 'published',
          event,
        });
      }

      // Process albums
      for (const event of albumEvents) {
        const titleTag = event.tags.find(tag => tag[0] === "title")?.[1];
        const title = titleTag || "Untitled Album";
        
        // Count tracks in album
        const trackTags = event.tags.filter(tag => tag[0] === "e");
        const trackCount = trackTags.length;

        uploadHistory.push({
          id: event.id,
          date: new Date(event.created_at * 1000).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          title,
          type: 'album',
          status: 'published',
          event,
          trackCount,
        });
      }

      // Sort by date (newest first)
      uploadHistory.sort((a, b) => {
        const dateA = new Date(a.event.created_at * 1000);
        const dateB = new Date(b.event.created_at * 1000);
        return dateB.getTime() - dateA.getTime();
      });

      return uploadHistory;
    },
    enabled: !!nostr && !!user,
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}