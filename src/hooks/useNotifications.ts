import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';

export interface Notification {
  id: string;
  type: 'group_update' | 'tag_post' | 'tag_reply' | 'reaction' | 'post_approved' | 'post_removed' | 'join_request';
  message: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
  groupId?: string;
  pubkey?: string;
}

export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['notifications', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) return [];

      const notifications: Notification[] = [];
      const readNotifications = JSON.parse(localStorage.getItem(`notifications:${user.pubkey}`) || '{}');

      // Fetch group updates (Kind 34550) where user is tagged
      const groupUpdateEvents = await nostr.query(
        [{ kinds: [34550], '#p': [user.pubkey] }],
        { signal }
      );

      // Fetch posts where user is tagged (Kind 1)
      const taggedPostEvents = await nostr.query(
        [{ kinds: [1], '#p': [user.pubkey] }],
        { signal }
      );

      // Fetch replies where user is tagged (Kind 1111)
      const taggedReplyEvents = await nostr.query(
        [{ kinds: [1111], '#p': [user.pubkey] }],
        { signal }
      );

      // Fetch reactions to user's posts (Kind 7)
      const reactionEvents = await nostr.query(
        [{ kinds: [7], '#p': [user.pubkey] }],
        { signal }
      );

      // Fetch post approvals for user's posts (Kind 4550)
      const postApprovalEvents = await nostr.query(
        [{ kinds: [4550], '#p': [user.pubkey] }],
        { signal }
      );

      // Fetch post removals for user's posts (Kind 4551)
      const postRemovalEvents = await nostr.query(
        [{ kinds: [4551], '#p': [user.pubkey] }],
        { signal }
      );

      // If user is a moderator, fetch join requests (Kind 4552)
      // First, find groups where user is a moderator
      const moderatedGroups = await nostr.query(
        [{ kinds: [34550], '#p': [user.pubkey, '', 'moderator'] }],
        { signal }
      );

      // For each group, fetch join requests
      const joinRequestPromises = moderatedGroups.map(group => {
        const groupId = group.tags.find(tag => tag[0] === 'd')?.[1];
        if (!groupId) return Promise.resolve([]);
        
        return nostr.query(
          [{ kinds: [4552], '#a': [`34550:${group.pubkey}:${groupId}`] }],
          { signal }
        );
      });

      const joinRequestResults = await Promise.all(joinRequestPromises);
      const joinRequestEvents = joinRequestResults.flat();

      // Process group update events
      groupUpdateEvents.forEach(event => {
        const groupId = event.tags.find(tag => tag[0] === 'd')?.[1];
        const groupName = event.tags.find(tag => tag[0] === 'name')?.[1] || 'Unknown group';
        
        notifications.push({
          id: event.id,
          type: 'group_update',
          message: `Your group "${groupName}" has been updated`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          eventId: event.id,
          groupId
        });
      });

      // Process tagged post events
      taggedPostEvents.forEach(event => {
        notifications.push({
          id: event.id,
          type: 'tag_post',
          message: `You were tagged in a post`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          eventId: event.id,
          pubkey: event.pubkey
        });
      });

      // Process tagged reply events
      taggedReplyEvents.forEach(event => {
        notifications.push({
          id: event.id,
          type: 'tag_reply',
          message: `You were tagged in a reply`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          eventId: event.id,
          pubkey: event.pubkey
        });
      });

      // Process reaction events
      reactionEvents.forEach(event => {
        const targetEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
        
        notifications.push({
          id: event.id,
          type: 'reaction',
          message: `Someone reacted to your post`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          eventId: targetEventId,
          pubkey: event.pubkey
        });
      });

      // Process post approval events
      postApprovalEvents.forEach(event => {
        const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
        const communityParts = communityRef?.split(':');
        const groupId = communityParts?.[2];
        
        notifications.push({
          id: event.id,
          type: 'post_approved',
          message: `Your post to a group was approved`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
          groupId
        });
      });

      // Process post removal events
      postRemovalEvents.forEach(event => {
        const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
        const communityParts = communityRef?.split(':');
        const groupId = communityParts?.[2];
        
        notifications.push({
          id: event.id,
          type: 'post_removed',
          message: `Your post to a group was removed`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
          groupId
        });
      });

      // Process join request events
      joinRequestEvents.forEach(event => {
        const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
        const communityParts = communityRef?.split(':');
        const groupId = communityParts?.[2];
        const requesterPubkey = event.tags.find(tag => tag[0] === 'p')?.[1];
        
        notifications.push({
          id: event.id,
          type: 'join_request',
          message: `Someone requested to join a group you moderate`,
          createdAt: event.created_at,
          read: !!readNotifications[event.id],
          pubkey: requesterPubkey,
          groupId
        });
      });

      // Sort notifications by creation time (newest first)
      return notifications.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user,
  });
}

export function useMarkNotificationAsRead() {
  const { user } = useCurrentUser();

  return (notificationId: string) => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    readNotifications[notificationId] = true;
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
  };
}

export function useUnreadNotificationsCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter(notification => !notification.read).length;
}