import { Crown, Shield } from "lucide-react";
import { useCommunityContext } from "@/hooks/useCommunityHooks";

// Compact version for sidebars or smaller spaces
export function CommunityPrivilegesCompact() {
  const {
    userRole,
    getCommunityName,
    selectedCommunity,
  } = useCommunityContext();

  if (!selectedCommunity) {
    return (
      <div className="text-xs text-muted-foreground">
        No artist page selected
      </div>
    );
  }

  const communityName = getCommunityName(selectedCommunity);

  return (
    <div className="text-xs">
      <div className="flex items-center space-x-1">
        {userRole === 'owner' ? (
          <Crown className="h-3 w-3 text-yellow-500" />
        ) : (
          <Shield className="h-3 w-3 text-blue-500" />
        )}
        <span className="text-muted-foreground">
          {userRole} of {communityName}
        </span>
      </div>
    </div>
  );
}