import { Link } from "react-router-dom";
import { useUserGroups } from "@/hooks/useUserGroups";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    const descriptionTag = community.tags.find((tag: string[]) => tag[0] === "description"); // Added
    const imageTag = community.tags.find((tag: string[]) => tag[0] === "image");
    const dTag = community.tags.find((tag: string[]) => tag[0] === "d");
    const moderatorTags = community.tags.filter((tag: string[]) => tag[0] === "p" && tag[3] === "moderator"); // Added

    const name = nameTag ? nameTag[1] : (dTag ? dTag[1] : "Unnamed Group");
    const description = descriptionTag ? descriptionTag[1] : "No description available"; // Added
    const image = imageTag ? imageTag[1] : "/placeholder-community.jpg"; 
    const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
    
    const isPinned = isGroupPinned(communityId);

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
        "overflow-hidden flex flex-col relative group",
        role === "pinned" && "ring-1 ring-primary/20"
      )}>
        <div className="h-40 overflow-hidden">
          {image && (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Group";
              }}
            />
          )}
        </div>
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {moderatorTags.length} moderator{moderatorTags.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="line-clamp-3">{description}</p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link to={`/group/${encodeURIComponent(communityId)}`}>
              View Group
            </Link>
          </Button>
        </CardFooter>
        
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pinned groups first */}
            {userGroups?.pinned.map(community => renderGroupCard(community, "pinned"))}
            
            {/* Then other groups */}
            {userGroups?.owned.map(community => renderGroupCard(community, "owner"))}
            {userGroups?.moderated.map(community => renderGroupCard(community, "moderator"))}
            {userGroups?.member.map(community => renderGroupCard(community, "member"))}
          </div>
      )}
    </div>
  );
}
