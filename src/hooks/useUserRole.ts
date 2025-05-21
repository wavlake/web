import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { parseNostrAddress } from "@/lib/nostr-utils";
import { useGroupMembership } from "./useGroupMembership";

export type UserRole = "owner" | "moderator" | "member" | null;

/**
 * Hook to determine the user's role in a group
 * @param communityId The community ID to check role for
 */
export function useUserRole(communityId?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: isMember } = useGroupMembership(communityId);
  
  return useQuery({
    queryKey: ["user-role", communityId, user?.pubkey],
    queryFn: async (c) => {
      if (!user || !communityId) return null;
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Parse the community ID to get the pubkey and identifier
      const parsedId = communityId.includes(':') 
        ? parseNostrAddress(communityId)
        : null;
      
      if (!parsedId) return null;
      
      // Fetch the community event
      const events = await nostr.query([{ 
        kinds: [34550],
        authors: [parsedId.pubkey],
        "#d": [parsedId.identifier],
      }], { signal });
      
      if (events.length === 0) return null;
      
      const community = events[0];
      
      // Check if user is the owner
      if (community.pubkey === user.pubkey) {
        return "owner" as UserRole;
      }
      
      // Check if user is a moderator
      const isModerator = community.tags.some(
        tag => tag[0] === "p" && tag[1] === user.pubkey && tag[3] === "moderator"
      );
      
      if (isModerator) {
        return "moderator" as UserRole;
      }
      
      // Check if user is a member
      if (isMember) {
        return "member" as UserRole;
      }
      
      return null;
    },
    enabled: !!nostr && !!communityId && !!user,
  });
}