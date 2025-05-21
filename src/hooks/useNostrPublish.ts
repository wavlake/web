import { useNostr } from "@nostrify/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { getPostExpirationTimestamp } from "../lib/utils";

interface EventTemplate {
  kind: number;
  content?: string;
  tags?: string[][];
  created_at?: number;
}

interface UseNostrPublishOptions {
  invalidateQueries?: { queryKey: unknown[] }[];
  onSuccessCallback?: () => void;
}

// Group Meta
// - 34550: Group meta

// Post Creation
// - 11: Create Post
// - 1111: Reply to post
// - 7: React to post

// Post Moderation
// - 4550: Approve post
// - 4551: Remove post

// Joining Groups
// - 14550: Mod Approved members list
// - 14551: Mod Declined members list
// - 14552: Mod Banned users lists
// - 4552: Request to join group
// - 4553: Request to leave group

// Cashu
// - 17375: Replaceable event for wallet info
// - 7375: Token events for unspent proofs
// - 7376: Spending history events
// - 7374: Quote events (optional)
// - 10019: ZAP info events
// - 9321: ZAP events

const protectedEventKinds = [
  7, // Reactions
  11, // Posts
  1111, // Comments (replies)
  34550, // Group meta
];

const expirationEventKinds = [
  7, // Reactions
  11, // Posts
  1111, // Comments (replies)
];

export function useNostrPublish(options?: UseNostrPublishOptions) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (t: EventTemplate) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the client tag if it doesn't exist
        if (!tags.some((tag) => tag[0] === "client")) {
          tags.push(["client", "chorus"]);
        }

        // // Add protected tag for all events except kind 0 (metadata) and kind 3 (contacts)
        // if (protectedEventKinds.includes(t.kind) && !tags.some((tag) => tag[0] === "-")) {
        //   tags.push(["-"]);
        // }

        const expiration = getPostExpirationTimestamp();
        if (expirationEventKinds.includes(t.kind) && !tags.some((tag) => tag[0] === "expiration") && expiration) {
          tags.push(["expiration", expiration.toString()]);
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        await nostr.event(event, { signal: AbortSignal.timeout(5000) });
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (event) => {
      console.log("Event published successfully:", event);
      
      // Invalidate specified queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(query => {
          queryClient.invalidateQueries(query);
        });
      }
      
      // Call the onSuccess callback if provided
      if (options?.onSuccessCallback) {
        options.onSuccessCallback();
      }
      
      // Auto-invalidate queries based on event kind
      if (event) {
        // Get community ID from tags if present
        const communityTag = event.tags?.find(tag => tag[0] === "a");
        const communityId = communityTag ? communityTag[1] : undefined;
        
        // Invalidate relevant queries based on event kind
        switch (event.kind) {
          case 4550: // Approve post
            if (communityId) {
              queryClient.invalidateQueries({ queryKey: ["approved-posts", communityId] });
              queryClient.invalidateQueries({ queryKey: ["pending-posts-count", communityId] });
            }
            break;
          case 4551: // Remove post
            if (communityId) {
              queryClient.invalidateQueries({ queryKey: ["removed-posts", communityId] });
              queryClient.invalidateQueries({ queryKey: ["approved-posts", communityId] });
              queryClient.invalidateQueries({ queryKey: ["pending-posts", communityId] });
            }
            break;
          case 14552: // Ban user
            if (communityId) {
              queryClient.invalidateQueries({ queryKey: ["banned-users", communityId] });
              // Also invalidate posts since banned users' posts should be hidden
              queryClient.invalidateQueries({ queryKey: ["approved-posts", communityId] });
              queryClient.invalidateQueries({ queryKey: ["pending-posts", communityId] });
            }
            break;
          case 11: // Post
          case 1111: // Reply
            if (communityId) {
              queryClient.invalidateQueries({ queryKey: ["pending-posts", communityId] });
              queryClient.invalidateQueries({ queryKey: ["pending-posts-count", communityId] });
              queryClient.invalidateQueries({ queryKey: ["replies", event.id] });
            }
            break;
        }
      }
    },
  });
}