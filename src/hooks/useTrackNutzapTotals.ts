import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { CASHU_EVENT_KINDS } from "@/lib/cashu";

interface TrackNutzapTotal {
  trackId: string;
  totalAmount: number;
  zapCount: number;
}

/**
 * Hook to fetch nutzap totals for multiple tracks
 * Used in the MusicPublisher component to display revenue data
 */
export function useTrackNutzapTotals(trackIds: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["track-nutzap-totals", trackIds.sort()], // Sort for stable key
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      if (!nostr || trackIds.length === 0) {
        return [] as TrackNutzapTotal[];
      }

      // Query all nutzaps for these tracks in one request
      const events = await nostr.query([{
        kinds: [CASHU_EVENT_KINDS.ZAP],
        "#e": trackIds,
        limit: 500, // Increased limit for multiple tracks
      }], { signal });

      // Process events and group by track ID
      const trackTotals = new Map<string, { totalAmount: number; zapCount: number }>();

      // Initialize all tracks with zero values
      trackIds.forEach(trackId => {
        trackTotals.set(trackId, { totalAmount: 0, zapCount: 0 });
      });

      for (const event of events) {
        try {
          // Get the track ID from the 'e' tag
          const trackId = event.tags.find(tag => tag[0] === "e")?.[1];
          if (!trackId || !trackIds.includes(trackId)) continue;

          // Get proofs from tags
          const proofTags = event.tags.filter(tag => tag[0] === "proof");
          if (proofTags.length === 0) continue;

          const proofs = proofTags
            .map(tag => {
              try {
                return JSON.parse(tag[1]);
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);

          // Calculate amount and add to total
          let eventAmount = 0;
          for (const proof of proofs) {
            eventAmount += proof.amount;
          }
          
          if (proofs.length > 0 && eventAmount > 0) {
            const current = trackTotals.get(trackId)!;
            trackTotals.set(trackId, {
              totalAmount: current.totalAmount + eventAmount,
              zapCount: current.zapCount + 1
            });
          }
        } catch (error) {
          console.error("Error processing nutzap for track:", error);
        }
      }

      // Convert map to array
      return Array.from(trackTotals.entries()).map(([trackId, data]) => ({
        trackId,
        totalAmount: data.totalAmount,
        zapCount: data.zapCount
      }));
    },
    enabled: !!nostr && trackIds.length > 0,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Helper hook to get nutzap total for a single track
 */
export function useTrackNutzapTotal(trackId: string) {
  const { data: totals = [] } = useTrackNutzapTotals(trackId ? [trackId] : []);
  return totals.find(total => total.trackId === trackId) || { trackId, totalAmount: 0, zapCount: 0 };
}