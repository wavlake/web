import { useNostr } from "@/hooks/useNostr";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useState, useEffect, useRef } from "react";
import { NostrEvent } from "@nostrify/nostrify";
import { KINDS } from "@/lib/nostr-kinds";

export interface ModerationNotification {
  id: string;
  type: 'report' | 'report_action' | 'join_request' | 'leave_request';
  message: string;
  createdAt: number;
  read: boolean;
  eventId: string;
  groupId: string;
  pubkey: string;
  reportType?: string;
  actionType?: string;
}

// Helper function to get community ID
const getCommunityId = (community: NostrEvent) => {
  const dTag = community.tags.find(tag => tag[0] === "d");
  return `${KINDS.GROUP}:${community.pubkey}:${dTag ? dTag[1] : ""}`;
};

export function useModerationNotifications(): ModerationNotification[] {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: userGroupsData } = useUserGroups();
  
  const [notifications, setNotifications] = useState<ModerationNotification[]>([]);
  const subscriptionRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Only run if user is a moderator or owner
    if (!user || !nostr || !userGroupsData || 
        (!userGroupsData.owned?.length && !userGroupsData.moderated?.length)) {
      setNotifications([]);
      return;
    }

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.abort();
    }

    const controller = new AbortController();
    subscriptionRef.current = controller;

    async function setupModerationSubscription() {
      try {
        // Get moderated groups
        const moderatedGroups = [
          ...(userGroupsData!.owned || []), 
          ...(userGroupsData!.moderated || [])
        ];
        
        const groupIds = moderatedGroups.map(group => getCommunityId(group));
        
        if (groupIds.length === 0) {
          setNotifications([]);
          return;
        }

        const readNotifications = JSON.parse(localStorage.getItem(`notifications:${user!.pubkey}`) || '{}');

        // 1. Get initial historical data with query()
        const [reportEvents, reportActionEvents, joinRequestEvents, leaveRequestEvents] = await Promise.all([
          nostr.query([{ 
            kinds: [KINDS.REPORT],
            '#a': groupIds,
            limit: 20 
          }], { signal: controller.signal }),
          
          nostr.query([{ 
            kinds: [KINDS.GROUP_CLOSE_REPORT],
            '#a': groupIds,
            limit: 20 
          }], { signal: controller.signal }),
          
          nostr.query([{ 
            kinds: [KINDS.GROUP_JOIN_REQUEST],
            '#a': groupIds,
            limit: 20 
          }], { signal: controller.signal }),
          
          nostr.query([{ 
            kinds: [KINDS.GROUP_LEAVE_REQUEST],
            '#a': groupIds,
            limit: 20 
          }], { signal: controller.signal })
        ]);

        // Process initial historical data
        const initialNotifications: ModerationNotification[] = [];
        
        // Process reports
        for (const event of reportEvents) {
          if (event.pubkey === user!.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          const pTag = event.tags.find(tag => tag[0] === 'p');
          const eTag = event.tags.find(tag => tag[0] === 'e');
          const reportType = pTag && pTag[2] ? pTag[2] : 
                            (eTag && eTag[2] ? eTag[2] : 'other');

          initialNotifications.push({
            id: event.id,
            type: 'report',
            message: `New ${reportType} report in group`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: event.id,
            groupId,
            pubkey: event.pubkey,
            reportType
          });
        }

        // Process report actions
        for (const event of reportActionEvents) {
          if (event.pubkey === user!.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          const reportId = event.tags.find(tag => tag[0] === 'e')?.[1];
          const actionType = event.tags.find(tag => tag[0] === 't')?.[1] || 'unknown action';

          if (reportId) {
            initialNotifications.push({
              id: event.id,
              type: 'report_action',
              message: `Moderator took action (${actionType}) on a report`,
              createdAt: event.created_at,
              read: !!readNotifications[event.id],
              eventId: reportId,
              groupId,
              pubkey: event.pubkey,
              actionType
            });
          }
        }

        // Process join requests
        for (const event of joinRequestEvents) {
          if (event.pubkey === user!.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          initialNotifications.push({
            id: event.id,
            type: 'join_request',
            message: `New request to join group`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: event.id,
            groupId,
            pubkey: event.pubkey
          });
        }

        // Process leave requests
        for (const event of leaveRequestEvents) {
          if (event.pubkey === user!.pubkey) continue;
          
          const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
          if (!groupId) continue;

          initialNotifications.push({
            id: event.id,
            type: 'leave_request',
            message: `User requested to leave group`,
            createdAt: event.created_at,
            read: !!readNotifications[event.id],
            eventId: event.id,
            groupId,
            pubkey: event.pubkey
          });
        }

        // Set initial notifications
        setNotifications(initialNotifications.sort((a, b) => b.createdAt - a.createdAt));

        // 2. Set up persistent subscription for real-time updates
        const subscriptionStartTime = Math.floor(Date.now() / 1000);
        
        for await (const msg of nostr.req([{
          kinds: [KINDS.REPORT, KINDS.GROUP_CLOSE_REPORT, KINDS.GROUP_JOIN_REQUEST, KINDS.GROUP_LEAVE_REQUEST],
          '#a': groupIds,
          since: subscriptionStartTime // Only new events from now
        }], { signal: controller.signal })) {
          
          if (controller.signal.aborted) break;
          
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            
            // Skip events from the user themselves
            if (event.pubkey === user!.pubkey) continue;
            
            const groupId = event.tags.find(tag => tag[0] === 'a')?.[1];
            if (!groupId) continue;

            let newNotification: ModerationNotification | null = null;

            switch (event.kind) {
              case KINDS.REPORT: {
                const pTag = event.tags.find(tag => tag[0] === 'p');
                const eTag = event.tags.find(tag => tag[0] === 'e');
                const reportType = pTag && pTag[2] ? pTag[2] : 
                                  (eTag && eTag[2] ? eTag[2] : 'other');

                newNotification = {
                  id: event.id,
                  type: 'report',
                  message: `New ${reportType} report in group`,
                  createdAt: event.created_at,
                  read: false, // New events are unread
                  eventId: event.id,
                  groupId,
                  pubkey: event.pubkey,
                  reportType
                };
                break;
              }
              
              case KINDS.GROUP_CLOSE_REPORT: {
                const reportId = event.tags.find(tag => tag[0] === 'e')?.[1];
                const actionType = event.tags.find(tag => tag[0] === 't')?.[1] || 'unknown action';

                if (reportId) {
                  newNotification = {
                    id: event.id,
                    type: 'report_action',
                    message: `Moderator took action (${actionType}) on a report`,
                    createdAt: event.created_at,
                    read: false,
                    eventId: reportId,
                    groupId,
                    pubkey: event.pubkey,
                    actionType
                  };
                }
                break;
              }
              
              case KINDS.GROUP_JOIN_REQUEST: {
                newNotification = {
                  id: event.id,
                  type: 'join_request',
                  message: `New request to join group`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.id,
                  groupId,
                  pubkey: event.pubkey
                };
                break;
              }
              
              case KINDS.GROUP_LEAVE_REQUEST: {
                newNotification = {
                  id: event.id,
                  type: 'leave_request',
                  message: `User requested to leave group`,
                  createdAt: event.created_at,
                  read: false,
                  eventId: event.id,
                  groupId,
                  pubkey: event.pubkey
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
          console.error('[useModerationNotifications] Subscription error:', error);
          // On error, clear notifications to avoid stale data
          setNotifications([]);
        }
      }
    }

    setupModerationSubscription();

    return () => {
      controller.abort();
      subscriptionRef.current = null;
    };
  }, [nostr, user, userGroupsData]);

  return notifications;
}