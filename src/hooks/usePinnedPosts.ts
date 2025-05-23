import { useNostr } from "./useNostr";
import { useCurrentUser } from "./useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNostrPublish } from "./useNostrPublish";

export interface PinnedPost {
  eventId: string;
  relayUrl?: string;
}

export function usePinnedPosts(communityId: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { mutateAsync: publishEvent } = useNostrPublish();

  // Fetch pinned posts for the community
  const query = useQuery({
    queryKey: ["pinned-posts", communityId],
    queryFn: async (c) => {
      if (!nostr || !communityId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Fetch pinned posts events (kind 14554) for this community
      const events = await nostr.query([
        { 
          kinds: [14554], 
          "#a": [communityId],
          limit: 10 
        }
      ], { signal });

      // If no pinned posts events exist, return empty array
      if (!events || events.length === 0) {
        return [];
      }

      // Get all pinned post IDs from all events (in case multiple moderators pin posts)
      const pinnedPostIds = new Set<string>();
      
      for (const event of events) {
        // Extract the pinned post IDs from the "e" tags
        const eventTags = event.tags.filter(tag => tag[0] === "e");
        for (const tag of eventTags) {
          pinnedPostIds.add(tag[1]);
        }
      }

      return Array.from(pinnedPostIds);
    },
    enabled: !!nostr && !!communityId,
  });

  // Mutation to pin a post
  const pinPost = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("User not logged in");

      // Create tags for the event
      const tags = [
        ["a", communityId],
        ["e", eventId]
      ];

      // Publish the kind 14554 event
      await publishEvent({
        kind: 14554,
        tags,
        content: ""
      });

      return eventId;
    },
    onSuccess: () => {
      // Invalidate the pinned posts query to refetch
      queryClient.invalidateQueries({ queryKey: ["pinned-posts", communityId] });
    }
  });

  // Mutation to unpin a post
  const unpinPost = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("User not logged in");

      // Create a deletion event (kind 5) that references the pin event
      // First, we need to find the pin event for this post
      const signal = AbortSignal.timeout(5000);
      const pinEvents = await nostr.query([
        { 
          kinds: [14554], 
          authors: [user.pubkey],
          "#a": [communityId],
          "#e": [eventId],
          limit: 10 
        }
      ], { signal });

      if (pinEvents.length === 0) {
        throw new Error("Pin event not found");
      }

      // Delete the most recent pin event
      const pinEventToDelete = pinEvents[0];
      
      await publishEvent({
        kind: 5,
        tags: [["e", pinEventToDelete.id]],
        content: "Unpinning post"
      });

      return eventId;
    },
    onSuccess: () => {
      // Invalidate the pinned posts query to refetch
      queryClient.invalidateQueries({ queryKey: ["pinned-posts", communityId] });
    }
  });

  // Function to check if a post is pinned
  const isPostPinned = (eventId: string) => {
    const pinnedPostIds = query.data || [];
    return pinnedPostIds.includes(eventId);
  };

  return {
    pinnedPostIds: query.data || [],
    isLoading: query.isLoading,
    isPinning: pinPost.isPending,
    isUnpinning: unpinPost.isPending,
    pinPost: pinPost.mutateAsync,
    unpinPost: unpinPost.mutateAsync,
    isPostPinned
  };
}