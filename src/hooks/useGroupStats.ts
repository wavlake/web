import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { NostrEvent } from "@nostrify/nostrify";

export interface GroupStats {
  posts: number;
  participants: Set<string>;
}

/**
 * Hook to fetch and calculate statistics for Nostr groups
 * @param communities Array of community events to fetch stats for
 * @param enabled Whether the query should run
 * @returns Object with stats for each community indexed by communityId
 */
export function useGroupStats(communities: NostrEvent[] | undefined, enabled = true) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["group-stats", communities?.map(c => c.id).join(",")],
    queryFn: async (c) => {
      if (!communities || communities.length === 0 || !nostr) {
        return {};
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      const stats: Record<string, GroupStats> = {};

      // Create a filter for all communities to get posts in a single query
      const communityRefs = communities.map(community => {
        const dTag = community.tags.find(tag => tag[0] === "d");
        return `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
      });

      // Get all posts that reference any community
      const posts = await nostr.query([{
        kinds: [1, 4550],
        "#a": communityRefs,
        limit: 500
      }], { signal });

      // Process posts to get stats for each community
      for (const post of posts) {
        const communityTag = post.tags.find(tag => tag[0] === "a");
        if (!communityTag) continue;

        const communityId = communityTag[1];
        if (!stats[communityId]) {
          stats[communityId] = { posts: 0, participants: new Set() };
        }

        // Count posts and unique participants
        stats[communityId].posts++;
        stats[communityId].participants.add(post.pubkey);
      }

      return stats;
    },
    enabled: !!nostr && !!communities && communities.length > 0 && enabled,
  });
}