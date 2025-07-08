import { useContext } from "react";
import { CommunityContext, type CommunityContextValue } from "@/contexts/CommunityContext";

export function useCommunityContext(): CommunityContextValue {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error(
      "useCommunityContext must be used within a CommunityProvider"
    );
  }
  return context;
}

// Convenience hook for getting just the selected community
export function useSelectedCommunity() {
  const { selectedCommunity, isPersonalMode } = useCommunityContext();
  return { selectedCommunity, isPersonalMode };
}

// Convenience hook for community permissions
export function useCommunityPermissions() {
  const { userRole, canManageCommunity, canUpdateCommunity, canModerate } =
    useCommunityContext();

  return {
    userRole,
    canManageCommunity,
    canUpdateCommunity,
    canModerate,
  };
}