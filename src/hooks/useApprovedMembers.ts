import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { parseNostrAddress } from "@/lib/nostr-utils";
import { KINDS } from "@/lib/nostr-kinds";
import { useGroup } from "./useGroup";

/**
 * Hook to fetch and check approved members for a community
 * @param communityId The community ID to check approved members for
 */
export function useApprovedMembers(communityId: string) {
  const { nostr } = useNostr();
  const { data: group } = useGroup(communityId);

  // Parse community ID to get owner pubkey directly (avoid dependency waterfall)
  const ownerPubkey = communityId ? communityId.split(':')[1] : null;

  // Query for approved members list (optimized to run independently of group data)
  const { data: approvedMembersEvents, isLoading } = useQuery({
    queryKey: ["approved-members-list", communityId],
    queryFn: async (c) => {
      if (!ownerPubkey) {
        throw new Error("Invalid community ID format");
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Start with owner as primary moderator
      const moderators = new Set<string>([ownerPubkey]);

      // Add additional moderators if group data is available
      if (group?.tags) {
        for (const tag of group.tags) {
          if (tag[0] === "p" && tag[3] === "moderator") {
            moderators.add(tag[1]);
          }
        }
      }
      
      const events = await nostr.query([{ 
        kinds: [KINDS.GROUP_APPROVED_MEMBERS_LIST],
        authors: [...moderators],
        "#d": [communityId],
      }], { signal });
      
      return events;
    },
    enabled: !!ownerPubkey && !!communityId,
    // Add caching to prevent unnecessary re-queries
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for community details to get moderators
  const { data: communityEvent } = useQuery({
    queryKey: ["community-details", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Parse the community ID to get the pubkey and identifier
      const parsedId = communityId.includes(':') 
        ? parseNostrAddress(communityId)
        : null;
      
      if (!parsedId) return null;
      
      const events = await nostr.query([{ 
        kinds: [KINDS.GROUP],
        authors: [parsedId.pubkey],
        "#d": [parsedId.identifier],
      }], { signal });
      
      return events[0] || null;
    },
    enabled: !!nostr && !!communityId,
  });

  // Extract approved members pubkeys
  const approvedMembers = approvedMembersEvents?.flatMap(event => 
    event.tags.filter(tag => tag[0] === "p").map(tag => tag[1])
  ) || [];

  // Extract moderator pubkeys
  const moderators = communityEvent?.tags
    .filter(tag => tag[0] === "p" && tag[3] === "moderator")
    .map(tag => tag[1]) || [];

  // Always include the community owner in the member list
  const allMembers = [...new Set([
    ownerPubkey, // Always include owner
    ...moderators, // Include moderators
    ...approvedMembers // Include regular approved members
  ])].filter(Boolean) as string[];

  /**
   * Check if a user is an approved member, moderator, or owner
   * @param pubkey The pubkey to check
   * @returns boolean indicating if the user is approved
   */
  const isApprovedMember = (pubkey: string): boolean => {
    return allMembers.includes(pubkey);
  };

  return {
    approvedMembers: allMembers, // Return all members including owner and moderators
    moderators,
    isApprovedMember,
    isLoading
  };
}