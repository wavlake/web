import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useReliableGroupMembership } from "./useReliableGroupMembership";

export type UserRole = "owner" | "moderator" | "member" | null;

/**
 * Hook to determine the user's role in a group
 * @param communityId The community ID to check role for
 */
export function useUserRole(communityId?: string) {
  const { user } = useCurrentUser();
  const { data: membership } = useReliableGroupMembership(communityId);
  
  return useQuery({
    queryKey: ["user-role", communityId, user?.pubkey, membership],
    queryFn: async () => {
      if (!user || !communityId || !membership) return null;
      
      // Determine the user's role based on membership data
      if (membership.isOwner) {
        return "owner" as UserRole;
      }
      
      if (membership.isModerator) {
        return "moderator" as UserRole;
      }
      
      if (membership.isMember) {
        return "member" as UserRole;
      }
      
      return null;
    },
    enabled: !!user && !!communityId && !!membership,
  });
}