import { useNostr } from "@/hooks/useNostr";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook to manage banned users for a community
 */
export function useBannedUsers(communityId: string) {
  const { nostr } = useNostr();
  const { mutateAsync: publishEvent } = useNostrPublish();

  // Query for banned users
  const { 
    data: bannedUsersEvents, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ["banned-users", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{ 
        kinds: [14552],
        "#a": [communityId],
        limit: 50,
      }], { signal });
      
      return events;
    },
    enabled: !!nostr && !!communityId,
  });

  // Extract all banned user pubkeys from the events
  const bannedUsers = bannedUsersEvents?.flatMap(event => 
    event.tags.filter(tag => tag[0] === "p").map(tag => tag[1])
  ) || [];

  // Remove duplicates
  const uniqueBannedUsers = [...new Set(bannedUsers)];

  /**
   * Ban a user from the community
   */
  const banUser = async (pubkey: string) => {
    try {
      // Create a new list with the user added to banned list
      const tags = [
        ["a", communityId],
        ...uniqueBannedUsers.map(pk => ["p", pk]),
        ["p", pubkey] // Add the new banned user
      ];

      // Create banned users event (kind 14552)
      await publishEvent({
        kind: 14552,
        tags,
        content: "",
      });
      
      toast.success("User banned successfully!");
      refetch();
      return true;
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user. Please try again.");
      return false;
    }
  };

  /**
   * Unban a user from the community
   */
  const unbanUser = async (pubkey: string) => {
    try {
      // Filter out the user to unban
      const updatedBannedUsers = uniqueBannedUsers.filter(pk => pk !== pubkey);
      
      // Create a new list with the user removed
      const tags = [
        ["a", communityId],
        ...updatedBannedUsers.map(pk => ["p", pk])
      ];

      // Create updated banned users event (kind 14552)
      await publishEvent({
        kind: 14552,
        tags,
        content: "",
      });
      
      toast.success("User unbanned successfully!");
      refetch();
      return true;
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user. Please try again.");
      return false;
    }
  };

  /**
   * Check if a user is banned
   */
  const isUserBanned = (pubkey: string) => {
    return uniqueBannedUsers.includes(pubkey);
  };

  return {
    bannedUsers: uniqueBannedUsers,
    isLoading,
    banUser,
    unbanUser,
    isUserBanned,
    refetch
  };
}