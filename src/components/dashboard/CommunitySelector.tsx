import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCommunityContext } from "@/hooks/useCommunityHooks";
import { Users, User, Crown, Shield, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommunityOptionProps {
  name: string;
  role: "owner" | "moderator";
  memberCount?: number;
  image?: string;
}

function CommunityOption({
  name,
  role,
  memberCount,
  image,
}: CommunityOptionProps) {
  return (
    <div className="flex items-center space-x-3 py-1">
      <Avatar className="h-6 w-6">
        <AvatarImage src={image} alt={name} />
        <AvatarFallback className="text-xs">
          {name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium truncate">{name}</span>
          {role === "owner" ? (
            <Crown className="h-3 w-3 text-yellow-500" />
          ) : (
            <Shield className="h-3 w-3 text-blue-500" />
          )}
        </div>
        {memberCount !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{memberCount} members</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommunitySelectorProps {
  showFullWidth?: boolean;
  className?: string;
}

export function CommunitySelector({
  showFullWidth = false,
  className = "",
}: CommunitySelectorProps) {
  const navigate = useNavigate();
  const {
    selectedCommunityId,
    setSelectedCommunityId,
    communities,
    getCommunityName,
    getCommunityId,
    userRole,
    isLoading,
  } = useCommunityContext();

  const handleValueChange = (value: string) => {
    if (value === "create-new") {
      navigate("/create-group");
    } else {
      setSelectedCommunityId(value);
    }
  };

  const getDisplayValue = () => {
    return selectedCommunityId || "";
  };

  const getSelectedCommunityDisplay = () => {
    const community = communities.manageable.find(
      (c) => getCommunityId(c) === selectedCommunityId
    );
    if (!community) return "Select Community";

    const name = getCommunityName(community);
    const role =
      community.pubkey ===
      communities.owned.find((c) => c.pubkey === community.pubkey)?.pubkey
        ? "owner"
        : "moderator";

    return (
      <div className="flex items-center space-x-2">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-xs">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{name}</span>
        {role === "owner" ? (
          <Crown className="h-3 w-3 text-yellow-500" />
        ) : (
          <Shield className="h-3 w-3 text-blue-500" />
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-9 bg-muted rounded-md w-48"></div>
      </div>
    );
  }

  return (
    <div className={`${showFullWidth ? "w-full" : "w-64"} ${className}`}>
      <Select value={getDisplayValue()} onValueChange={handleValueChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select Artist Page">
            {getSelectedCommunityDisplay()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Communities Section */}
          {communities.manageable.length > 0 ? (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Artist Pages
              </div>

              {/* Owned Communities */}
              {communities.owned.map((community) => {
                const communityId = getCommunityId(community);
                const name = getCommunityName(community);

                return (
                  <SelectItem key={communityId} value={communityId}>
                    <CommunityOption
                      name={name}
                      role="owner"
                      // You could add member count here if available
                    />
                  </SelectItem>
                );
              })}

              {/* Moderated Communities */}
              {communities.moderated.map((community) => {
                const communityId = getCommunityId(community);
                const name = getCommunityName(community);

                return (
                  <SelectItem key={communityId} value={communityId}>
                    <CommunityOption
                      name={name}
                      role="moderator"
                      // You could add member count here if available
                    />
                  </SelectItem>
                );
              })}

              {/* Create New Community Option */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                Actions
              </div>
              <SelectItem value="create-new">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Artist Page</span>
                </div>
              </SelectItem>
            </>
          ) : (
            /* No Communities State */
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="mb-2">No artist pages yet</p>
              <p className="text-xs mb-3">
                Create your artist page to start building your community!
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => navigate("/create-group")}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Artist Page
              </Button>
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Current Context Info */}
      {userRole && (
        <div className="mt-1 text-xs text-muted-foreground">
          {userRole === "owner" ? "Owner" : "Moderator"} permissions
        </div>
      )}
    </div>
  );
}

