import { useQuery } from "@tanstack/react-query";
import { useNostr } from "@/hooks/useNostr";
import { KINDS } from "@/lib/nostr-kinds";
import type { NostrEvent } from "@nostrify/nostrify";

interface GroupDeletionRequest {
  deletionEvent: NostrEvent;
  groupId: string;
  isValid: boolean;
  reason?: string;
}

/**
 * Hook to fetch and validate deletion requests for groups
 * Returns a map of groupId -> deletion request info
 */
export function useGroupDeletionRequests(groupIds: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["group-deletion-requests", groupIds.sort()],
    queryFn: async (c) => {
      if (groupIds.length === 0) {
        return new Map<string, GroupDeletionRequest>();
      }

      try {
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
        
        // Query for kind 5 deletion events that reference groups via 'a' tags
        const deletionEvents = await nostr.query([{
          kinds: [KINDS.DELETION],
          "#a": groupIds,
          limit: 1000 // Should be enough for deletion requests
        }], { signal });

        const deletionMap = new Map<string, GroupDeletionRequest>();

        // Process each deletion event
        for (const deletionEvent of deletionEvents) {
          // Find the 'a' tags that reference groups (kind 34550)
          const aTags = deletionEvent.tags.filter(tag => 
            tag[0] === "a" && tag[1] && tag[1].startsWith(`${KINDS.GROUP}:`)
          );

          for (const aTag of aTags) {
            const groupId = aTag[1];
            
            // Parse the group ID to get the owner's pubkey
            const parts = groupId.split(":");
            if (parts.length !== 3 || parts[0] !== KINDS.GROUP.toString()) {
              continue;
            }
            
            const [, groupOwnerPubkey] = parts;
            
            // Validate that the deletion request is from the group owner
            const isValid = deletionEvent.pubkey === groupOwnerPubkey;
            
            // Only store the most recent valid deletion request for each group
            const existing = deletionMap.get(groupId);
            if (!existing || (isValid && deletionEvent.created_at > existing.deletionEvent.created_at)) {
              deletionMap.set(groupId, {
                deletionEvent,
                groupId,
                isValid,
                reason: deletionEvent.content || undefined
              });
            }
          }
        }

        return deletionMap;
      } catch (error) {
        console.error("Error fetching group deletion requests:", error);
        return new Map<string, GroupDeletionRequest>();
      }
    },
    enabled: groupIds.length > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Hook to check if a specific group has been deleted
 */
export function useIsGroupDeleted(groupId: string | undefined) {
  const { data: deletionRequests } = useGroupDeletionRequests(
    groupId ? [groupId] : []
  );

  if (!groupId || !deletionRequests) {
    return {
      isDeleted: false,
      deletionRequest: undefined,
      isLoading: false
    };
  }

  const deletionRequest = deletionRequests.get(groupId);
  
  return {
    isDeleted: deletionRequest?.isValid || false,
    deletionRequest: deletionRequest?.isValid ? deletionRequest : undefined,
    isLoading: false
  };
}