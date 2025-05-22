import { useNostr } from "@/hooks/useNostr";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NostrEvent } from "@nostrify/nostrify";

/**
 * Hook to update the approved members list for a community
 */
export function useUpdateApprovedMembers() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish({
    invalidateQueries: [
      { queryKey: ["approved-members-list"] },
      { queryKey: ["approved-posts"] },
      { queryKey: ["pending-posts"] }
    ]
  });

  /**
   * Fetch the current approved members list for a community
   * @param communityId The community ID
   * @returns Array of approved member pubkeys
   */
  const fetchApprovedMembers = async (communityId: string): Promise<string[]> => {
    try {
      const events = await nostr.query([{ 
        kinds: [14550],
        "#a": [communityId],
        limit: 10,
      }], { signal: AbortSignal.timeout(5000) });
      
      if (events.length === 0) {
        return [];
      }
      
      // Sort by created_at to get the most recent event
      const sortedEvents = [...events].sort((a, b) => b.created_at - a.created_at);
      const latestEvent = sortedEvents[0];
      
      // Extract approved members pubkeys
      return latestEvent.tags
        .filter(tag => tag[0] === "p")
        .map(tag => tag[1]);
    } catch (error) {
      console.error("Error fetching approved members:", error);
      throw new Error("Failed to fetch approved members list");
    }
  };

  /**
   * Remove a user from the approved members list
   * @param pubkey The pubkey of the user to remove
   * @param communityId The community ID
   * @returns Object with success status and message
   */
  const removeFromApprovedList = async (pubkey: string, communityId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Fetch current approved members
      const currentApprovedMembers = await fetchApprovedMembers(communityId);
      
      // Check if the user is in the approved list
      if (!currentApprovedMembers.includes(pubkey)) {
        // Return success but with a message indicating the user wasn't found
        return { 
          success: true, 
          message: "User is not in the approved members list" 
        };
      }
      
      // Create a new list without the user
      const updatedApprovedMembers = currentApprovedMembers.filter(p => p !== pubkey);
      
      // Create tags for the updated list
      const tags = [
        ["a", communityId],
        ...updatedApprovedMembers.map(p => ["p", p])
      ];
      
      // Publish the updated list
      await publishEvent({
        kind: 14550,
        tags,
        content: "",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["approved-members-list", communityId] });
      
      return { 
        success: true, 
        message: "User removed from approved members list" 
      };
    } catch (error) {
      console.error("Error removing user from approved list:", error);
      return { 
        success: false, 
        message: "Failed to remove user from approved members list" 
      };
    }
  };

  return {
    removeFromApprovedList,
    isPending
  };
}