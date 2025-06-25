import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useMemo } from 'react';

// Consumer-focused notification types - full social activity
const CONSUMER_NOTIFICATION_TYPES: Notification['type'][] = [
  'group_update',
  'tag_post',
  'tag_reply', 
  'reaction',
  'post_approved',
  'post_removed',
  'track_published', // Music from people they follow
  'album_published', // Albums from people they follow
  'nutzap_received', // Direct nutzaps to them
  'leave_request' // Leave requests if they're a moderator
];

/**
 * Hook that provides consumer-focused notifications
 * Shows full social activity feed for general users
 */
export function useConsumerNotifications() {
  const { data: allNotifications = [], isLoading, error, refetch } = useNotifications();

  const consumerNotifications = useMemo(() => {
    return allNotifications.filter(notification => 
      CONSUMER_NOTIFICATION_TYPES.includes(notification.type)
    );
  }, [allNotifications]);

  const unreadCount = useMemo(() => {
    return consumerNotifications.filter(notification => !notification.read).length;
  }, [consumerNotifications]);

  return {
    data: consumerNotifications,
    isLoading,
    error,
    refetch,
    unreadCount
  };
}