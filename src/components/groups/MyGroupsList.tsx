import { Link } from "react-router-dom";
import { useUserGroups } from "@/hooks/useUserGroups";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Shield, Users, Crown, Pin, PinOff } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NostrEvent } from "@nostrify/nostrify";
import { usePinnedGroups } from "@/hooks/usePinnedGroups";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MyGroupsList() {
  const { user } = useCurrentUser();
  const { data: userGroups, isLoading } = useUserGroups();
  const { pinGroup, unpinGroup, isGroupPinned, isUpdating } = usePinnedGroups();

  if (!user) {
    return null;
  }

  // If user has no groups and data is loaded, don't show the section
  if (!isLoading && 
      userGroups && 
      userGroups.pinned.length === 0 &&
      userGroups.owned.length === 0 && 
      userGroups.moderated.length === 0 && 
      userGroups.member.length === 0) {
    return null;
  }

  const renderGroupCard = (community: NostrEvent, role: "pinned" | "owner" | "moderator" | "member") => {
    // Extract community data from tags
    const nameTag = community.tags.find((tag: string[]) => tag[0] === "name");
    const imageTag = community.tags.find((tag: string[]) => tag[0] === "image");
    const dTag = community.tags.find((tag: string[]) => tag[0] === "d");

    const name = nameTag ? nameTag[1] : (dTag ? dTag[1] : "Unnamed Community");
    const image = imageTag ? imageTag[1] : "/placeholder-community.jpg";
    const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
    
    // Determine if this group is pinned
    const isPinned = isGroupPinned(communityId);
    
    // Determine the actual role for the icon (pinned groups still show their original role icon)
    const displayRole = role === "pinned" 
      ? (community.pubkey === user?.pubkey ? "owner" : 
         community.tags.some(tag => tag[0] === "p" && tag[1] === user?.pubkey && tag[3] === "moderator") ? "moderator" : "member")
      : role;

    const handleTogglePin = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isPinned) {
        unpinGroup(communityId);
      } else {
        pinGroup(communityId);
      }
    };

    return (
      <Card key={community.id} className={cn(
        "min-w-[250px] max-w-[250px] flex flex-col relative group",
        role === "pinned" && "ring-2 ring-primary/20"
      )}>
        <div className="h-28 overflow-hidden">
          {image && (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/600x400?text=Community";
              }}
            />
          )}
        </div>
        <CardHeader className="p-3">
          <CardTitle className="text-base truncate flex items-center gap-1">
            {displayRole === "owner" && <Crown className="h-4 w-4 text-yellow-500" />}
            {displayRole === "moderator" && <Shield className="h-4 w-4 text-blue-500" />}
            {displayRole === "member" && <Users className="h-4 w-4 text-green-500" />}
            {name}
          </CardTitle>
        </CardHeader>
        <CardFooter className="p-3 pt-0 mt-auto">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={`/group/${encodeURIComponent(communityId)}`}>
              Visit
            </Link>
          </Button>
        </CardFooter>
        
        {/* Pin/Unpin Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity",
                  isPinned && "opacity-100"
                )}
                onClick={handleTogglePin}
                disabled={isUpdating}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
                <span className="sr-only">{isPinned ? "Unpin group" : "Pin group"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPinned ? "Unpin from My Groups" : "Pin to My Groups"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Card>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">My Groups</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/create-group">Create Group</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex gap-4 pb-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-my-group-${index}`} className="min-w-[250px] max-w-[250px] flex flex-col">
              <div className="h-28 overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
              <CardHeader className="p-3">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardFooter className="p-3 pt-0">
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-4">
            {/* Pinned groups first */}
            {userGroups?.pinned.map(community => renderGroupCard(community, "pinned"))}
            
            {/* Then other groups */}
            {userGroups?.owned.map(community => renderGroupCard(community, "owner"))}
            {userGroups?.moderated.map(community => renderGroupCard(community, "moderator"))}
            {userGroups?.member.map(community => renderGroupCard(community, "member"))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}