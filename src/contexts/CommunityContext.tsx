import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { NostrEvent } from "@nostrify/nostrify";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export type Community = NostrEvent;

export type UserRole = "owner" | "moderator" | "member" | null;

export interface CommunityContextValue {
  // Community Selection
  selectedCommunity: Community | null;
  selectedCommunityId: string | null;
  setSelectedCommunity: (community: Community | null) => void;
  setSelectedCommunityId: (id: string | null) => void;

  // User's Communities
  communities: {
    owned: Community[];
    moderated: Community[];
    manageable: Community[]; // combined owned + moderated for switcher
  };

  // Current User Role
  userRole: UserRole;

  // Permissions
  canManageCommunity: boolean;
  canUpdateCommunity: boolean; // Only owners can update kind 34550 events
  canModerate: boolean;

  // Loading State
  isLoading: boolean;

  // Helper Functions
  isPersonalMode: boolean; // true when no community selected
  switchToPersonal: () => void;
  getCommunityName: (community: Community | null) => string;
  getCommunityId: (community: Community) => string;
}

export const CommunityContext = createContext<
  CommunityContextValue | undefined
>(undefined);

interface CommunityProviderProps {
  children: ReactNode;
}

export function CommunityProvider({ children }: CommunityProviderProps) {
  const { user } = useCurrentUser();
  const { data: userGroups, isLoading } = useUserGroups();

  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null
  );
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null
  );

  // Helper function to get community ID from NostrEvent
  const getCommunityId = (community: Community): string => {
    const dTag = community.tags.find((tag) => tag[0] === "d");
    return `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
  };

  // Helper function to get community name
  const getCommunityName = (community: Community | null): string => {
    if (!community) return "Personal";

    // First try to get name from tags (most common)
    const nameTag = community.tags.find((tag) => tag[0] === "name");
    if (nameTag && nameTag[1]) {
      return nameTag[1];
    }

    // Fallback to content field (if it exists and is JSON)
    if (community.content) {
      try {
        const content = JSON.parse(community.content);
        if (content.name || content.title) {
          return content.name || content.title;
        }
      } catch {
        // If content is not JSON, treat it as the name
        return community.content;
      }
    }

    // Final fallback to identifier from d tag
    const dTag = community.tags.find((tag) => tag[0] === "d");
    if (dTag && dTag[1]) {
      return dTag[1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return "Unnamed Community";
  };

  // Determine user's role in selected community
  const getUserRole = (): UserRole => {
    if (!selectedCommunity || !user) return null;

    // Check if owner
    if (selectedCommunity.pubkey === user.pubkey) {
      return "owner";
    }

    // Check if moderator
    const isModerator = selectedCommunity.tags.some(
      (tag) =>
        tag[0] === "p" && tag[1] === user.pubkey && tag[3] === "moderator"
    );

    if (isModerator) {
      return "moderator";
    }

    return "member";
  };

  const userRole = getUserRole();

  // Computed values
  const communities = {
    owned: userGroups?.owned || [],
    moderated: userGroups?.moderated || [],
    manageable: [
      ...(userGroups?.owned || []),
      ...(userGroups?.moderated || []),
    ],
  };

  const canManageCommunity = userRole === "owner" || userRole === "moderator";
  const canUpdateCommunity = userRole === "owner"; // Only owners can update kind 34550
  const canModerate = userRole === "owner" || userRole === "moderator";
  const isPersonalMode = selectedCommunityId === null;

  // Update selected community when ID changes
  useEffect(() => {
    if (!selectedCommunityId) {
      setSelectedCommunity(null);
      return;
    }

    // Find the community in user's manageable communities
    const community = communities.manageable.find(
      (c) => getCommunityId(c) === selectedCommunityId
    );
    setSelectedCommunity(community || null);
  }, [selectedCommunityId, communities.manageable]);

  // URL synchronization - read from URL params on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const communityParam = urlParams.get("communityId");

    if (communityParam) {
      setSelectedCommunityId(communityParam);
    } else {
      // Auto-select single manageable community if user has only one
      if (communities.manageable.length === 1 && selectedCommunityId === null) {
        const singleCommunity = communities.manageable[0];
        const communityId = getCommunityId(singleCommunity);
        setSelectedCommunityId(communityId);

        // Update URL to include the auto-selected community
        const newUrlParams = new URLSearchParams(window.location.search);
        newUrlParams.set("communityId", communityId);
        const newUrl = `${window.location.pathname}?${newUrlParams.toString()}${
          window.location.hash
        }`;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [communities.manageable, selectedCommunityId]);

  // URL synchronization - update URL when community changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("Updating URL with communityId:", selectedCommunityId);
    if (selectedCommunityId) {
      urlParams.set("communityId", selectedCommunityId);
    } else {
      urlParams.delete("communityId");
    }

    const newUrl = `${window.location.pathname}${
      urlParams.toString() ? "?" + urlParams.toString() : ""
    }${window.location.hash}`;
    window.history.replaceState(null, "", newUrl);
  }, [selectedCommunityId]);

  const switchToPersonal = () => {
    setSelectedCommunityId(null);
    setSelectedCommunity(null);
  };

  const contextValue: CommunityContextValue = {
    // Community Selection
    selectedCommunity,
    selectedCommunityId,
    setSelectedCommunity,
    setSelectedCommunityId,

    // User's Communities
    communities,

    // Current User Role
    userRole,

    // Permissions
    canManageCommunity,
    canUpdateCommunity,
    canModerate,

    // Loading State
    isLoading,

    // Helper Functions
    isPersonalMode,
    switchToPersonal,
    getCommunityName,
    getCommunityId,
  };

  return (
    <CommunityContext.Provider value={contextValue}>
      {children}
    </CommunityContext.Provider>
  );
}

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
