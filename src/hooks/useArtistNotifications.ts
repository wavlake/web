import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useMemo } from 'react';

// Artist-focused notification types - revenue/engagement focused
const ARTIST_NOTIFICATION_TYPES: Notification['type'][] = [
  'nutzap_received',
  'nutzap_track', 
  'nutzap_album',
  'nutzap_post',
  'track_reaction',
  'album_reaction',
  'track_published', // Their own music being published
  'album_published', // Their own albums being published
  'join_request', // Join requests for groups they moderate
  'report', // Reports in groups they moderate
  'report_action' // Report actions in groups they moderate
];

/**
 * Hook that provides artist-focused notifications
 * Filters out general social activity and focuses on revenue/engagement
 */
export function useArtistNotifications() {
  const { data: allNotifications = [], isLoading, error, refetch } = useNotifications();

  const artistNotifications = useMemo(() => {
    return allNotifications.filter(notification => 
      ARTIST_NOTIFICATION_TYPES.includes(notification.type)
    );
  }, [allNotifications]);

  const unreadCount = useMemo(() => {
    return artistNotifications.filter(notification => !notification.read).length;
  }, [artistNotifications]);

  return {
    data: artistNotifications,
    isLoading,
    error,
    refetch,
    unreadCount
  };
}