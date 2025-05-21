import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';

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

      const kinds = [1, 7, 1111, 4550, 4551, 34550];

      const events = await nostr.query(
        [{ kinds, '#p': [user.pubkey], limit: 20 }],
        { signal },
      );

      for (const event of events) {
        switch (event.kind) {
          case 1: {
            notifications.push({
              id: event.id,
              type: 'tag_post',
              message: `You were tagged in a post`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.id,
              pubkey: event.pubkey
            });
            break;
          }
          case 7: {
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
            break;
          }
          case 1111: {
            notifications.push({
              id: event.id,
              type: 'tag_reply',
              message: `You were tagged in a reply`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.id,
              pubkey: event.pubkey
            });
            break;
          }
          case 4550: {
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
            break;
          }
          case 4551: {
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
            break;
          }
          case 34550: {
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
            break;
          }
        }
      }

      // Sort notifications by creation time (newest first)
      return notifications;
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