import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { useUserGroups } from '@/hooks/useUserGroups';
import { NostrEvent } from '@nostrify/nostrify';
import { KINDS } from '@/lib/nostr-kinds';

export interface DashboardActivity {
  id: string;
  type: 'group_post' | 'music_published' | 'group_member_joined' | 'group_member_approved' | 'music_reaction' | 'nutzap_received' | 'group_post_reaction';
  message: string;
  createdAt: number;
  eventId?: string;
  groupId?: string;
  pubkey?: string;
  trackTitle?: string;
  albumTitle?: string;
  artistName?: string;
  amount?: number;
  groupName?: string;
}

// Helper function to get community ID
const getCommunityId = (community: NostrEvent) => {
  const dTag = community.tags.find(tag => tag[0] === "d");
  return `${KINDS.GROUP}:${community.pubkey}:${dTag ? dTag[1] : ""}`;
};

export function useDashboardActivity() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: userGroupsData } = useUserGroups();

  return useQuery({
    queryKey: ['dashboard-activity', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) return [];

      const activities: DashboardActivity[] = [];

      // Get groups where user is owner or moderator
      const managedGroups = [
        ...(userGroupsData?.owned || []),
        ...(userGroupsData?.moderated || [])
      ];

      // Get all group IDs where the user is a moderator or owner
      const groupIds = managedGroups.map(group => getCommunityId(group));

      if (groupIds.length > 0) {
        // Query for recent group posts in managed groups
        const groupPosts = await nostr.query(
          [{ 
            kinds: [KINDS.GROUP_POST],
            '#a': groupIds,
            limit: 20,
            since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
          }],
          { signal },
        );

        // Query for recent group approvals in managed groups
        const groupApprovals = await nostr.query(
          [{ 
            kinds: [KINDS.GROUP_APPROVED_MEMBERS_LIST],
            '#d': groupIds,
            limit: 10,
            since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
          }],
          { signal },
        );

        // Query for reactions on posts in managed groups
        const postIds = groupPosts.map(post => post.id);
        let groupPostReactions: NostrEvent[] = [];
        if (postIds.length > 0) {
          groupPostReactions = await nostr.query(
            [{ 
              kinds: [KINDS.REACTION],
              '#e': postIds,
              limit: 15
            }],
            { signal },
          );
        }

        // Process group posts
        for (const post of groupPosts) {
          // Skip posts from the user themselves
          if (post.pubkey === user.pubkey) continue;

          const groupId = post.tags.find(tag => tag[0] === 'a')?.[1];
          const group = managedGroups.find(g => getCommunityId(g) === groupId);
          const groupName = group?.tags.find(tag => tag[0] === "name")?.[1] || 'Unknown group';

          activities.push({
            id: post.id,
            type: 'group_post',
            message: `New post in ${groupName}`,
            createdAt: post.created_at,
            eventId: post.id,
            groupId,
            pubkey: post.pubkey,
            groupName
          });
        }

        // Process group member approvals
        for (const approval of groupApprovals) {
          // Skip if this is from the user themselves
          if (approval.pubkey === user.pubkey) continue;

          const groupId = approval.tags.find(tag => tag[0] === 'd')?.[1];
          const group = managedGroups.find(g => getCommunityId(g).endsWith(`:${groupId}`));
          const groupName = group?.tags.find(tag => tag[0] === "name")?.[1] || 'Unknown group';

          // Count newly approved members (compare with previous versions would be complex)
          const approvedPubkeys = approval.tags.filter(tag => tag[0] === 'p');
          if (approvedPubkeys.length > 0) {
            activities.push({
              id: approval.id,
              type: 'group_member_approved',
              message: `${approvedPubkeys.length} new member${approvedPubkeys.length > 1 ? 's' : ''} approved in ${groupName}`,
              createdAt: approval.created_at,
              eventId: approval.id,
              groupId: getCommunityId(group!),
              pubkey: approval.pubkey,
              groupName
            });
          }
        }

        // Process reactions on group posts
        for (const reaction of groupPostReactions) {
          // Skip reactions from the user themselves
          if (reaction.pubkey === user.pubkey) continue;

          const targetPostId = reaction.tags.find(tag => tag[0] === 'e')?.[1];
          const targetPost = groupPosts.find(post => post.id === targetPostId);
          
          if (targetPost) {
            const groupId = targetPost.tags.find(tag => tag[0] === 'a')?.[1];
            const group = managedGroups.find(g => getCommunityId(g) === groupId);
            const groupName = group?.tags.find(tag => tag[0] === "name")?.[1] || 'Unknown group';

            activities.push({
              id: reaction.id,
              type: 'group_post_reaction',
              message: `New reaction in ${groupName}`,
              createdAt: reaction.created_at,
              eventId: targetPostId,
              groupId,
              pubkey: reaction.pubkey,
              groupName
            });
          }
        }
      }

      // Query for user's music events
      const userMusicEvents = await nostr.query(
        [{ 
          kinds: [KINDS.MUSIC_TRACK, KINDS.MUSIC_ALBUM], 
          authors: [user.pubkey], 
          limit: 10,
          since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
        }],
        { signal },
      );

      // Process user's music publications
      for (const musicEvent of userMusicEvents) {
        const titleTag = musicEvent.tags.find(tag => tag[0] === 'title')?.[1];
        const artistTag = musicEvent.tags.find(tag => tag[0] === 'artist')?.[1];

        if (musicEvent.kind === KINDS.MUSIC_TRACK) {
          activities.push({
            id: musicEvent.id,
            type: 'music_published',
            message: `Published track "${titleTag || 'Untitled'}"`,
            createdAt: musicEvent.created_at,
            eventId: musicEvent.id,
            pubkey: musicEvent.pubkey,
            trackTitle: titleTag,
            artistName: artistTag
          });
        } else if (musicEvent.kind === KINDS.MUSIC_ALBUM) {
          activities.push({
            id: musicEvent.id,
            type: 'music_published',
            message: `Published album "${titleTag || 'Untitled'}"`,
            createdAt: musicEvent.created_at,
            eventId: musicEvent.id,
            pubkey: musicEvent.pubkey,
            albumTitle: titleTag,
            artistName: artistTag
          });
        }
      }

      // Query for reactions to user's music
      const userMusicEventIds = userMusicEvents.map(event => event.id);
      if (userMusicEventIds.length > 0) {
        const musicReactions = await nostr.query(
          [{ 
            kinds: [KINDS.REACTION], 
            '#e': userMusicEventIds, 
            limit: 15,
            since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
          }],
          { signal },
        );

        // Process reactions to user's music
        for (const reaction of musicReactions) {
          // Skip reactions from the user themselves
          if (reaction.pubkey === user.pubkey) continue;

          const targetEventId = reaction.tags.find(tag => tag[0] === 'e')?.[1];
          const originalEvent = userMusicEvents.find(musicEvent => musicEvent.id === targetEventId);
          
          if (originalEvent) {
            const titleTag = originalEvent.tags.find(tag => tag[0] === 'title')?.[1];
            const type = originalEvent.kind === KINDS.MUSIC_TRACK ? 'track' : 'album';

            activities.push({
              id: reaction.id,
              type: 'music_reaction',
              message: `New reaction on your ${type} "${titleTag || 'Untitled'}"`,
              createdAt: reaction.created_at,
              eventId: targetEventId,
              pubkey: reaction.pubkey,
              trackTitle: originalEvent.kind === KINDS.MUSIC_TRACK ? titleTag : undefined,
              albumTitle: originalEvent.kind === KINDS.MUSIC_ALBUM ? titleTag : undefined
            });
          }
        }
      }

      // Sort activities by creation time (newest first) and limit to 15
      return activities
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 15);
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}