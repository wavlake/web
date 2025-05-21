import { useNostr } from "./useNostr";
import { useCurrentUser } from "./useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { NostrEvent } from "@nostrify/nostrify";
import { usePinnedGroups, PinnedGroup } from "./usePinnedGroups";

export function useUserGroups() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { pinnedGroups, isLoading: isPinnedGroupsLoading } = usePinnedGroups();

  return useQuery({
    queryKey: ["user-groups", user?.pubkey, pinnedGroups],
    queryFn: async (c) => {
      if (!user || !nostr) return { 
        pinned: [] as NostrEvent[], 
        owned: [] as NostrEvent[], 
        moderated: [] as NostrEvent[], 
        member: [] as NostrEvent[],
        allGroups: [] as NostrEvent[] // Added to track all groups the user is part of
      };

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
      // Use a more specific query to get all lists that include the user
      const approvedMembersLists = await nostr.query([
        { 
          kinds: [14550], 
          "#p": [user.pubkey],
          limit: 200 
        }
      ], { signal });
      
      // Communities where user is an approved member
      const memberCommunities: NostrEvent[] = [];
      
      for (const list of approvedMembersLists) {
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

      // Process pinned groups
      const pinnedCommunities: NostrEvent[] = [];
      
      // Map of community IDs to prevent duplicates
      const processedCommunityIds = new Set<string>();
      
      // Process pinned groups first
      for (const pinnedGroup of pinnedGroups) {
        const [_, pubkey, identifier] = pinnedGroup.communityId.split(":");
        
        // Find the community in our fetched communities
        const community = allCommunities.find(c => {
          const dTag = c.tags.find(tag => tag[0] === "d");
          return c.pubkey === pubkey && dTag && dTag[1] === identifier;
        });
        
        if (community) {
          pinnedCommunities.push(community);
          
          // Mark this community as processed
          const communityId = `34550:${community.pubkey}:${identifier}`;
          processedCommunityIds.add(communityId);
        }
      }
      
      // Filter out pinned communities from other lists to avoid duplicates
      const filteredOwned = ownedCommunities.filter(community => {
        const dTag = community.tags.find(tag => tag[0] === "d");
        const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
        return !processedCommunityIds.has(communityId);
      });
      
      const filteredModerated = moderatedCommunities.filter(community => {
        const dTag = community.tags.find(tag => tag[0] === "d");
        const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
        return !processedCommunityIds.has(communityId);
      });
      
      const filteredMember = memberCommunities.filter(community => {
        const dTag = community.tags.find(tag => tag[0] === "d");
        const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
        return !processedCommunityIds.has(communityId);
      });
      
      // We don't need to find additional member communities
      // Just return the filtered lists we already have
      
      return {
        pinned: pinnedCommunities,
        owned: filteredOwned,
        moderated: filteredModerated,
        member: filteredMember
      };
    },
    enabled: !!nostr && !!user,
  });
}