import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useModerationNotifications } from '@/hooks/useModerationNotifications';
import { useDirectNotifications } from '@/hooks/useDirectNotifications';
import { useMusicNotifications } from '@/hooks/useMusicNotifications';
// import { useNutzapNotifications } from '@/hooks/useNutzapNotifications'; // Disabled to avoid duplicate subscriptions
import { useMemo } from 'react';

export interface Notification {
  id: string;
  type: 'group_update' | 'tag_post' | 'tag_reply' | 'reaction' | 'post_approved' | 'post_removed' | 'join_request' | 'report' | 'report_action' | 'leave_request' | 'track_published' | 'album_published' | 'track_reaction' | 'album_reaction' | 'nutzap_received' | 'nutzap_track' | 'nutzap_album' | 'nutzap_post';
  message: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
  groupId?: string;
  pubkey?: string;
  reportType?: string;
  actionType?: string;
  trackId?: string;
  albumId?: string;
  trackTitle?: string;
  albumTitle?: string;
  artistName?: string;
  nutzapAmount?: number;
  nutzapComment?: string;
}


export function useNotifications() {
  // Get all notification types via their respective subscription hooks
  const moderationNotifications = useModerationNotifications();
  const directNotifications = useDirectNotifications();
  const musicNotifications = useMusicNotifications();
  // const nutzapNotifications = useNutzapNotifications(); // Disabled - useAutoReceiveNutzaps handles this
  const nutzapNotifications: any[] = []; // Empty for now - nutzaps handled by useAutoReceiveNutzaps

  // Merge all notification types
  const allNotifications = useMemo(() => {
    const allNotifications = [...moderationNotifications, ...directNotifications, ...musicNotifications, ...nutzapNotifications];
    
    // Sort by creation time (newest first) and remove duplicates by ID
    const uniqueNotifications = allNotifications
      .filter((notification, index, array) => 
        array.findIndex(n => n.id === notification.id) === index
      )
      .sort((a, b) => b.createdAt - a.createdAt);
      
    return uniqueNotifications;
  }, [moderationNotifications, directNotifications, musicNotifications, nutzapNotifications]);

  return {
    data: allNotifications,
    isLoading: false,
    isError: false,
    error: null
  };
}

export function useMarkNotificationAsRead() {
  const { user } = useCurrentUser();

  return (notificationId: string) => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    readNotifications[notificationId] = true;
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
    
    // Note: No need to invalidate queries since we're using real-time subscriptions
  };
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useCurrentUser();
  const { data: notifications = [] } = useNotifications();

  return () => {
    if (!user) return;
    
    const storageKey = `notifications:${user.pubkey}`;
    const readNotifications = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    // Mark all current notifications as read
    for (const notification of notifications) {
      readNotifications[notification.id] = true;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(readNotifications));
    
    // Note: No need to invalidate queries since we're using real-time subscriptions
  };
}

export function useUnreadNotificationsCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter(notification => !notification.read).length;
}