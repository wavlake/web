import { useNostr } from "@/hooks/useNostr";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState, useEffect, useRef } from "react";
import { NostrEvent } from "@nostrify/nostrify";
import { KINDS } from "@/lib/nostr-kinds";
import { CASHU_EVENT_KINDS } from "@/lib/cashu";

export interface NutzapNotification {
  id: string;
  type: 'nutzap_received' | 'nutzap_track' | 'nutzap_album' | 'nutzap_post';
  message: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
  groupId?: string;
  pubkey?: string;
  trackId?: string;
  albumId?: string;
  trackTitle?: string;
  albumTitle?: string;
  artistName?: string;
  nutzapAmount?: number;
  nutzapComment?: string;
}

export function useNutzapNotifications(): NutzapNotification[] {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  
  const [notifications, setNotifications] = useState<NutzapNotification[]>([]);
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

    async function setupNutzapSubscription() {
      try {
        const readNotifications = JSON.parse(localStorage.getItem(`notifications:${user!.pubkey}`) || '{}');

        // Get user's music events for nutzap tracking
        const userMusicEvents = await nostr.query(
          [{ 
            kinds: [KINDS.MUSIC_TRACK, KINDS.MUSIC_ALBUM], 
            authors: [user!.pubkey], 
            limit: 50 
          }],
          { signal: controller.signal },
        );

        // Query for nutzaps received by the user
        const receivedNutzaps = await nostr.query(
          [{ 
            kinds: [CASHU_EVENT_KINDS.ZAP], 
            '#p': [user!.pubkey], 
            limit: 20,
            since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
          }],
          { signal: controller.signal },
        );

        // Process initial historical data
        const initialNotifications: NutzapNotification[] = [];

        // Process nutzaps received by the user
        for (const event of receivedNutzaps) {
          // Skip notifications from the user themselves
          if (event.pubkey === user!.pubkey) continue;
          
          // Parse the nutzap amount from proof tags
          const proofTags = event.tags.filter(tag => tag[0] === 'proof');
          const totalAmount = proofTags.reduce((sum, tag) => {
            try {
              const proof = JSON.parse(tag[1]);
              return sum + (proof.amount || 0);
            } catch {
              return sum;
            }
          }, 0);

          // Get the target event (if any) to determine if it's a track, album, or post
          const targetEventTag = event.tags.find(tag => tag[0] === 'e');
          const targetEventId = targetEventTag?.[1];
          
          // Get the comment from the event content
          const comment = event.content || '';

          if (targetEventId) {
            // Find what type of content was nutzapped
            const targetTrack = userMusicEvents.find(musicEvent => 
              musicEvent.id === targetEventId && musicEvent.kind === KINDS.MUSIC_TRACK
            );
            const targetAlbum = userMusicEvents.find(musicEvent => 
              musicEvent.id === targetEventId && musicEvent.kind === KINDS.MUSIC_ALBUM
            );

            if (targetTrack) {
              // Nutzap on user's track
              const titleTag = targetTrack.tags.find(tag => tag[0] === 'title')?.[1];
              const artistTag = targetTrack.tags.find(tag => tag[0] === 'artist')?.[1];
              
              initialNotifications.push({
                id: event.id,
                type: 'nutzap_track',
                message: `sent you ${totalAmount} sats for your track`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: targetEventId,
                pubkey: event.pubkey,
                trackId: targetEventId,
                trackTitle: titleTag || 'Untitled Track',
                artistName: artistTag || 'Unknown Artist',
                nutzapAmount: totalAmount,
                nutzapComment: comment
              });
            } else if (targetAlbum) {
              // Nutzap on user's album
              const titleTag = targetAlbum.tags.find(tag => tag[0] === 'title')?.[1];
              const artistTag = targetAlbum.tags.find(tag => tag[0] === 'artist')?.[1];
              
              initialNotifications.push({
                id: event.id,
                type: 'nutzap_album',
                message: `sent you ${totalAmount} sats for your album`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: targetEventId,
                pubkey: event.pubkey,
                albumId: targetEventId,
                albumTitle: titleTag || 'Untitled Album',
                artistName: artistTag || 'Unknown Artist',
                nutzapAmount: totalAmount,
                nutzapComment: comment
              });
            } else {
              // Nutzap on a post (could be group post or regular post)
              const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
              
              initialNotifications.push({
                id: event.id,
                type: 'nutzap_post',
                message: `sent you ${totalAmount} sats for your post`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: targetEventId,
                pubkey: event.pubkey,
                groupId,
                nutzapAmount: totalAmount,
                nutzapComment: comment
              });
            }
          } else {
            // General nutzap to the user (no specific target)
            initialNotifications.push({
              id: event.id,
              type: 'nutzap_received',
              message: `sent you ${totalAmount} sats`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              pubkey: event.pubkey,
              nutzapAmount: totalAmount,
              nutzapComment: comment
            });
          }
        }

        // Set initial notifications
        setNotifications(initialNotifications.sort((a, b) => b.createdAt - a.createdAt));

        // 2. Set up persistent subscription for real-time updates
        const subscriptionStartTime = Math.floor(Date.now() / 1000);
        
        for await (const msg of nostr.req([{
          kinds: [CASHU_EVENT_KINDS.ZAP],
          '#p': [user!.pubkey],
          since: subscriptionStartTime // Only new events from now
        }], { signal: controller.signal })) {
          
          if (controller.signal.aborted) break;
          
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            
            // Skip events from the user themselves
            if (event.pubkey === user!.pubkey) continue;
            
            // Parse the nutzap amount from proof tags
            const proofTags = event.tags.filter(tag => tag[0] === 'proof');
            const totalAmount = proofTags.reduce((sum, tag) => {
              try {
                const proof = JSON.parse(tag[1]);
                return sum + (proof.amount || 0);
              } catch {
                return sum;
              }
            }, 0);

            // Get the target event (if any) to determine if it's a track, album, or post
            const targetEventTag = event.tags.find(tag => tag[0] === 'e');
            const targetEventId = targetEventTag?.[1];
            
            // Get the comment from the event content
            const comment = event.content || '';

            let newNotification: NutzapNotification | null = null;

            if (targetEventId) {
              // Find what type of content was nutzapped
              const targetTrack = userMusicEvents.find(musicEvent => 
                musicEvent.id === targetEventId && musicEvent.kind === KINDS.MUSIC_TRACK
              );
              const targetAlbum = userMusicEvents.find(musicEvent => 
                musicEvent.id === targetEventId && musicEvent.kind === KINDS.MUSIC_ALBUM
              );

              if (targetTrack) {
                // Nutzap on user's track
                const titleTag = targetTrack.tags.find(tag => tag[0] === 'title')?.[1];
                const artistTag = targetTrack.tags.find(tag => tag[0] === 'artist')?.[1];
                
                newNotification = {
                  id: event.id,
                  type: 'nutzap_track',
                  message: `sent you ${totalAmount} sats for your track`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: targetEventId,
                  pubkey: event.pubkey,
                  trackId: targetEventId,
                  trackTitle: titleTag || 'Untitled Track',
                  artistName: artistTag || 'Unknown Artist',
                  nutzapAmount: totalAmount,
                  nutzapComment: comment
                };
              } else if (targetAlbum) {
                // Nutzap on user's album
                const titleTag = targetAlbum.tags.find(tag => tag[0] === 'title')?.[1];
                const artistTag = targetAlbum.tags.find(tag => tag[0] === 'artist')?.[1];
                
                newNotification = {
                  id: event.id,
                  type: 'nutzap_album',
                  message: `sent you ${totalAmount} sats for your album`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: targetEventId,
                  pubkey: event.pubkey,
                  albumId: targetEventId,
                  albumTitle: titleTag || 'Untitled Album',
                  artistName: artistTag || 'Unknown Artist',
                  nutzapAmount: totalAmount,
                  nutzapComment: comment
                };
              } else {
                // Nutzap on a post (could be group post or regular post)
                const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
                
                newNotification = {
                  id: event.id,
                  type: 'nutzap_post',
                  message: `sent you ${totalAmount} sats for your post`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: targetEventId,
                  pubkey: event.pubkey,
                  groupId,
                  nutzapAmount: totalAmount,
                  nutzapComment: comment
                };
              }
            } else {
              // General nutzap to the user (no specific target)
              newNotification = {
                id: event.id,
                type: 'nutzap_received',
                message: `sent you ${totalAmount} sats`,
                createdAt: event.created_at,
                read: false,
                pubkey: event.pubkey,
                nutzapAmount: totalAmount,
                nutzapComment: comment
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
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[useNutzapNotifications] Subscription error:', error);
          // On error, clear notifications to avoid stale data
          setNotifications([]);
        }
      }
    }

    setupNutzapSubscription();

    return () => {
      controller.abort();
      subscriptionRef.current = null;
    };
  }, [nostr, user]);

  return notifications;
}