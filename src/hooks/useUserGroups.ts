import { useNostr } from "./useNostr";
import { useCurrentUser } from "./useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { NostrEvent } from "@nostrify/nostrify";

export function useUserGroups() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["user-groups", user?.pubkey],
    queryFn: async (c) => {
      if (!user || !nostr) return { owned: [] as NostrEvent[], moderated: [] as NostrEvent[], member: [] as NostrEvent[] };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Fetch all communities
      const allCommunities = await nostr.query([{ kinds: [34550], limit: 100 }], { signal });
      
      // Owned communities (where user is the creator)
      const ownedCommunities = allCommunities.filter(
        (community) => community.pubkey === user.pubkey
      );
      
      // Moderated communities (where user is listed as a moderator)
      const moderatedCommunities = allCommunities.filter(
        (community) => 
          community.pubkey !== user.pubkey && // Not already counted as owned
          community.tags.some(tag => 
            tag[0] === "p" && 
            tag[1] === user.pubkey && 
            tag[3] === "moderator"
          )
      );
      
      // Fetch approved members lists to find communities where user is a member
      const approvedMembersLists = await nostr.query([
        { 
          kinds: [30000], 
          "#d": ["approved-users"],
          limit: 100 
        }
      ], { signal });
      
      // Communities where user is an approved member
      const memberCommunities: NostrEvent[] = [];
      
      for (const list of approvedMembersLists) {
        // Check if user is in this approved members list
        const isApprovedMember = list.tags.some(tag => 
          tag[0] === "p" && tag[1] === user.pubkey
        );
        
        if (isApprovedMember) {
          // Find which community this list belongs to
          const communityRef = list.tags.find(tag => tag[0] === "a");
          if (communityRef) {
            const [_, pubkey, identifier] = communityRef[1].split(":");
            
            // Find the actual community event
            const community = allCommunities.find(c => {
              const dTag = c.tags.find(tag => tag[0] === "d");
              return c.pubkey === pubkey && dTag && dTag[1] === identifier;
            });
            
            if (community && 
                !ownedCommunities.includes(community) && 
                !moderatedCommunities.includes(community)) {
              memberCommunities.push(community);
            }
          }
        }
      }
      
      return {
        owned: ownedCommunities,
        moderated: moderatedCommunities,
        member: memberCommunities
      };
    },
    enabled: !!nostr && !!user,
  });
}