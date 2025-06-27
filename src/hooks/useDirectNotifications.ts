import { useNostr } from "@/hooks/useNostr";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState, useEffect, useRef } from "react";
import { NostrEvent } from "@nostrify/nostrify";
import { KINDS } from "@/lib/nostr-kinds";

export interface DirectNotification {
  id: string;
  type: 'group_update' | 'tag_post' | 'tag_reply' | 'reaction' | 'post_approved' | 'post_removed';
  message: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
  groupId?: string;
  pubkey?: string;
}

export function useDirectNotifications(): DirectNotification[] {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  
  const [notifications, setNotifications] = useState<DirectNotification[]>([]);
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

    async function setupDirectSubscription() {
      try {
        const readNotifications = JSON.parse(localStorage.getItem(`notifications:${user!.pubkey}`) || '{}');

        const kinds = [
          KINDS.GROUP_POST,
          KINDS.REACTION,
          KINDS.GROUP_POST_REPLY,
          KINDS.GROUP_POST_APPROVAL,
          KINDS.GROUP_POST_REMOVAL,
          KINDS.GROUP
        ];

        // 1. Get initial historical data with query()
        const events = await nostr.query(
          [{ kinds, '#p': [user!.pubkey], limit: 20 }],
          { signal: controller.signal },
        );

        // Process initial historical data
        const initialNotifications: DirectNotification[] = [];

        for (const event of events) {
          // Skip notifications from the user themselves
          if (event.pubkey === user!.pubkey) continue;
          
          // Extract group ID from 'a' tag if present (for all notification types)
          const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
          const communityParts = communityRef?.split(':');
          const groupId = communityParts && communityParts[0] === String(KINDS.GROUP) ? communityRef : undefined;
          
          switch (event.kind) {
            case KINDS.GROUP_POST: {
              initialNotifications.push({
                id: event.id,
                type: 'tag_post',
                message: `tagged you in a post`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: event.id,
                pubkey: event.pubkey,
                groupId
              });
              break;
            }
            case KINDS.REACTION: {
              const targetEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
              
              initialNotifications.push({
                id: event.id,
                type: 'reaction',
                message: `reacted to your post`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: targetEventId,
                pubkey: event.pubkey,
                groupId
              });
              break;
            }
            case KINDS.GROUP_POST_REPLY: {
              initialNotifications.push({
                id: event.id,
                type: 'tag_reply',
                message: `tagged you in a reply`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: event.id,
                pubkey: event.pubkey,
                groupId
              });
              break;
            }
            case KINDS.GROUP_POST_APPROVAL: {
              // For post approval events, we already have the full community reference in the 'a' tag
              const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
              
              initialNotifications.push({
                id: event.id,
                type: 'post_approved',
                message: `approved your post to a group`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
                pubkey: event.pubkey,
                groupId: communityRef
              });
              break;
            }
            case KINDS.GROUP_POST_REMOVAL: {
              // For post removal events, we already have the full community reference in the 'a' tag
              const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
              
              initialNotifications.push({
                id: event.id,
                type: 'post_removed',
                message: `removed your post from a group`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
                pubkey: event.pubkey,
                groupId: communityRef
              });
              break;
            }
            case KINDS.GROUP: {
              const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
              const groupName = event.tags.find(tag => tag[0] === 'name')?.[1] || 'Unknown group';
              // Create the full community reference in the format "34550:pubkey:identifier"
              const fullGroupId = `${KINDS.GROUP}:${event.pubkey}:${dTag}`;
              
              initialNotifications.push({
                id: event.id,
                type: 'group_update',
                message: `Your group "${groupName}" has been updated`,
                createdAt: event.created_at,
                read: !!readNotifications[event.id],
                eventId: event.id,
                groupId: fullGroupId
              });
              break;
            }
          }
        }

        // Set initial notifications
        setNotifications(initialNotifications.sort((a, b) => b.createdAt - a.createdAt));

        // 2. Set up persistent subscription for real-time updates
        const subscriptionStartTime = Math.floor(Date.now() / 1000);
        
        for await (const msg of nostr.req([{
          kinds,
          '#p': [user!.pubkey],
          since: subscriptionStartTime // Only new events from now
        }], { signal: controller.signal })) {
          
          if (controller.signal.aborted) break;
          
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            
            // Skip events from the user themselves
            if (event.pubkey === user!.pubkey) continue;
            
            // Extract group ID from 'a' tag if present
            const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
            const communityParts = communityRef?.split(':');
            const groupId = communityParts && communityParts[0] === String(KINDS.GROUP) ? communityRef : undefined;

            let newNotification: DirectNotification | null = null;

            switch (event.kind) {
              case KINDS.GROUP_POST: {
                newNotification = {
                  id: event.id,
                  type: 'tag_post',
                  message: `tagged you in a post`,
                  createdAt: event.created_at,
                  read: false, // New events are unread
                  eventId: event.id,
                  pubkey: event.pubkey,
                  groupId
                };
                break;
              }
              case KINDS.REACTION: {
                const targetEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
                
                newNotification = {
                  id: event.id,
                  type: 'reaction',
                  message: `reacted to your post`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: targetEventId,
                  pubkey: event.pubkey,
                  groupId
                };
                break;
              }
              case KINDS.GROUP_POST_REPLY: {
                newNotification = {
                  id: event.id,
                  type: 'tag_reply',
                  message: `tagged you in a reply`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.id,
                  pubkey: event.pubkey,
                  groupId
                };
                break;
              }
              case KINDS.GROUP_POST_APPROVAL: {
                const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
                
                newNotification = {
                  id: event.id,
                  type: 'post_approved',
                  message: `approved your post to a group`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
                  pubkey: event.pubkey,
                  groupId: communityRef
                };
                break;
              }
              case KINDS.GROUP_POST_REMOVAL: {
                const communityRef = event.tags.find(tag => tag[0] === 'a')?.[1];
                
                newNotification = {
                  id: event.id,
                  type: 'post_removed',
                  message: `removed your post from a group`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.tags.find(tag => tag[0] === 'e')?.[1],
                  pubkey: event.pubkey,
                  groupId: communityRef
                };
                break;
              }
              case KINDS.GROUP: {
                const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
                const groupName = event.tags.find(tag => tag[0] === 'name')?.[1] || 'Unknown group';
                const fullGroupId = `${KINDS.GROUP}:${event.pubkey}:${dTag}`;
                
                newNotification = {
                  id: event.id,
                  type: 'group_update',
                  message: `Your group "${groupName}" has been updated`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.id,
                  groupId: fullGroupId
                };
                break;
              }
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
          console.error('[useDirectNotifications] Subscription error:', error);
          // On error, clear notifications to avoid stale data
          setNotifications([]);
        }
      }
    }

    setupDirectSubscription();

    return () => {
      controller.abort();
      subscriptionRef.current = null;
    };
  }, [nostr, user]);

  return notifications;
}