import { useNostr } from "@/hooks/useNostr";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState, useEffect, useRef } from "react";
import { NostrEvent } from "@nostrify/nostrify";
import { KINDS } from "@/lib/nostr-kinds";

export interface MusicNotification {
  id: string;
  type: 'track_published' | 'album_published' | 'track_reaction' | 'album_reaction';
  message: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
  pubkey?: string;
  trackId?: string;
  albumId?: string;
  trackTitle?: string;
  albumTitle?: string;
  artistName?: string;
}

export function useMusicNotifications(): MusicNotification[] {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  
  const [notifications, setNotifications] = useState<MusicNotification[]>([]);
  const subscriptionRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user || !nostr) {
      setNotifications([]);
      return;
    }

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.abort();
    }

    const controller = new AbortController();
    subscriptionRef.current = controller;

    async function setupMusicSubscription() {
      try {
        const readNotifications = JSON.parse(localStorage.getItem(`notifications:${user!.pubkey}`) || '{}');

        // 1. Get user's follow list to show music from people they follow
        const followListEvents = await nostr.query(
          [{ kinds: [KINDS.FOLLOW_LIST], authors: [user!.pubkey], limit: 1 }],
          { signal: controller.signal },
        );

        let followedPubkeys: string[] = [];
        if (followListEvents.length > 0) {
          // Get the most recent follow list
          const latestFollowList = followListEvents.sort((a, b) => b.created_at - a.created_at)[0];
          followedPubkeys = latestFollowList.tags
            .filter(tag => tag[0] === 'p' && tag[1])
            .map(tag => tag[1]);
        }

        // 2. Get user's music events for reaction tracking
        const userMusicEvents = await nostr.query(
          [{ 
            kinds: [KINDS.MUSIC_TRACK, KINDS.MUSIC_ALBUM], 
            authors: [user!.pubkey], 
            limit: 50 
          }],
          { signal: controller.signal },
        );

        // Process initial historical data
        const initialNotifications: MusicNotification[] = [];

        // Get music events from people the user follows
        let musicEvents: NostrEvent[] = [];
        if (followedPubkeys.length > 0) {
          musicEvents = await nostr.query(
            [{ 
              kinds: [KINDS.MUSIC_TRACK, KINDS.MUSIC_ALBUM], 
              authors: followedPubkeys, 
              limit: 10,
              since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
            }],
            { signal: controller.signal },
          );
        }

        // Process music events from followed users
        for (const event of musicEvents) {
          // Skip notifications from the user themselves
          if (event.pubkey === user!.pubkey) continue;
          
          const titleTag = event.tags.find(tag => tag[0] === 'title')?.[1];
          const artistTag = event.tags.find(tag => tag[0] === 'artist')?.[1];
          
          if (event.kind === KINDS.MUSIC_TRACK) {
            initialNotifications.push({
              id: event.id,
              type: 'track_published',
              message: `published a new track`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.id,
              pubkey: event.pubkey,
              trackId: event.id,
              trackTitle: titleTag || 'Untitled Track',
              artistName: artistTag || 'Unknown Artist'
            });
          } else if (event.kind === KINDS.MUSIC_ALBUM) {
            initialNotifications.push({
              id: event.id,
              type: 'album_published',
              message: `published a new album`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: event.id,
              pubkey: event.pubkey,
              albumId: event.id,
              albumTitle: titleTag || 'Untitled Album',
              artistName: artistTag || 'Unknown Artist'
            });
          }
        }

        // Get reactions to user's music
        const userMusicEventIds = userMusicEvents.map(event => event.id);
        let musicReactions: NostrEvent[] = [];
        if (userMusicEventIds.length > 0) {
          musicReactions = await nostr.query(
            [{ 
              kinds: [KINDS.REACTION], 
              '#e': userMusicEventIds, 
              limit: 20 
            }],
            { signal: controller.signal },
          );
        }

        // Process reactions to user's music
        for (const event of musicReactions) {
          // Skip notifications from the user themselves
          if (event.pubkey === user!.pubkey) continue;
          
          const targetEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
          if (!targetEventId) continue;
          
          // Find the original music event to get details
          const originalEvent = userMusicEvents.find(musicEvent => musicEvent.id === targetEventId);
          if (!originalEvent) continue;
          
          const titleTag = originalEvent.tags.find(tag => tag[0] === 'title')?.[1];
          const artistTag = originalEvent.tags.find(tag => tag[0] === 'artist')?.[1];
          
          if (originalEvent.kind === KINDS.MUSIC_TRACK) {
            initialNotifications.push({
              id: event.id,
              type: 'track_reaction',
              message: `reacted to your track`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: targetEventId,
              pubkey: event.pubkey,
              trackId: targetEventId,
              trackTitle: titleTag || 'Untitled Track',
              artistName: artistTag || 'Unknown Artist'
            });
          } else if (originalEvent.kind === KINDS.MUSIC_ALBUM) {
            initialNotifications.push({
              id: event.id,
              type: 'album_reaction',
              message: `reacted to your album`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: targetEventId,
              pubkey: event.pubkey,
              albumId: targetEventId,
              albumTitle: titleTag || 'Untitled Album',
              artistName: artistTag || 'Unknown Artist'
            });
          }
        }

        // Set initial notifications
        setNotifications(initialNotifications.sort((a, b) => b.createdAt - a.createdAt));

        // 3. Set up persistent subscriptions for real-time updates
        const subscriptionStartTime = Math.floor(Date.now() / 1000);
        
        // Subscribe to new music from followed users (if any)
        if (followedPubkeys.length > 0) {
          // Note: This creates a separate subscription but we could combine them
          for await (const msg of nostr.req([{
            kinds: [KINDS.MUSIC_TRACK, KINDS.MUSIC_ALBUM],
            authors: followedPubkeys,
            since: subscriptionStartTime
          }], { signal: controller.signal })) {
            
            if (controller.signal.aborted) break;
            
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              
              // Skip events from the user themselves
              if (event.pubkey === user!.pubkey) continue;
              
              const titleTag = event.tags.find(tag => tag[0] === 'title')?.[1];
              const artistTag = event.tags.find(tag => tag[0] === 'artist')?.[1];
              
              let newNotification: MusicNotification | null = null;

              if (event.kind === KINDS.MUSIC_TRACK) {
                newNotification = {
                  id: event.id,
                  type: 'track_published',
                  message: `published a new track`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.id,
                  pubkey: event.pubkey,
                  trackId: event.id,
                  trackTitle: titleTag || 'Untitled Track',
                  artistName: artistTag || 'Unknown Artist'
                };
              } else if (event.kind === KINDS.MUSIC_ALBUM) {
                newNotification = {
                  id: event.id,
                  type: 'album_published',
                  message: `published a new album`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.id,
                  pubkey: event.pubkey,
                  albumId: event.id,
                  albumTitle: titleTag || 'Untitled Album',
                  artistName: artistTag || 'Unknown Artist'
                };
              }

              // Add new notification if created
              if (newNotification) {
                setNotifications(prev => {
                  // Check for duplicates
                  if (prev.some(n => n.id === newNotification.id)) {
                    return prev;
                  }
                  
                  // Add new notification and re-sort
                  return [newNotification, ...prev].sort((a, b) => b.createdAt - a.createdAt);
                });
              }
            }
          }
        }

        // Subscribe to reactions on user's music (if any)
        if (userMusicEventIds.length > 0) {
          for await (const msg of nostr.req([{
            kinds: [KINDS.REACTION],
            '#e': userMusicEventIds,
            since: subscriptionStartTime
          }], { signal: controller.signal })) {
            
            if (controller.signal.aborted) break;
            
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              
              // Skip events from the user themselves
              if (event.pubkey === user!.pubkey) continue;
              
              const targetEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
              if (!targetEventId) continue;
              
              // Find the original music event to get details
              const originalEvent = userMusicEvents.find(musicEvent => musicEvent.id === targetEventId);
              if (!originalEvent) continue;
              
              const titleTag = originalEvent.tags.find(tag => tag[0] === 'title')?.[1];
              const artistTag = originalEvent.tags.find(tag => tag[0] === 'artist')?.[1];
              
              let newNotification: MusicNotification | null = null;

              if (originalEvent.kind === KINDS.MUSIC_TRACK) {
                newNotification = {
                  id: event.id,
                  type: 'track_reaction',
                  message: `reacted to your track`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: targetEventId,
                  pubkey: event.pubkey,
                  trackId: targetEventId,
                  trackTitle: titleTag || 'Untitled Track',
                  artistName: artistTag || 'Unknown Artist'
                };
              } else if (originalEvent.kind === KINDS.MUSIC_ALBUM) {
                newNotification = {
                  id: event.id,
                  type: 'album_reaction',
                  message: `reacted to your album`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: targetEventId,
                  pubkey: event.pubkey,
                  albumId: targetEventId,
                  albumTitle: titleTag || 'Untitled Album',
                  artistName: artistTag || 'Unknown Artist'
                };
              }

              // Add new notification if created
              if (newNotification) {
                setNotifications(prev => {
                  // Check for duplicates
                  if (prev.some(n => n.id === newNotification.id)) {
                    return prev;
                  }
                  
                  // Add new notification and re-sort
                  return [newNotification, ...prev].sort((a, b) => b.createdAt - a.createdAt);
                });
              }
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[useMusicNotifications] Subscription error:', error);
          // On error, clear notifications to avoid stale data
          setNotifications([]);
        }
      }
    }

    setupMusicSubscription();

    return () => {
      controller.abort();
      subscriptionRef.current = null;
    };
  }, [nostr, user]);

  return notifications;
}