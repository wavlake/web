import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Separator } from "@/components/ui/separator";
import { Users, Pin, PinOff } from "lucide-react"; // Added Pin, PinOff
import Header from "@/components/ui/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { MyGroupsList } from "@/components/groups/MyGroupsList";
import { usePinnedGroups } from "@/hooks/usePinnedGroups"; // Added
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added
import { cn } from "@/lib/utils"; // Added
import { toast } from "sonner"; // Added

export default function Groups() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { pinGroup, unpinGroup, isGroupPinned, isUpdating } = usePinnedGroups(); // Initialized hook

  const { data: communities, isLoading } = useQuery({
    queryKey: ["communities"],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{ kinds: [34550], limit: 50 }], { signal });
      return events;
    },
    enabled: !!nostr,
  });

  return (
    <div className="container mx-auto py-4 px-6">
      <Header />
      <Separator className="my-4" />
      
      <MyGroupsList />
      
      <h2 className="text-2xl font-bold mb-6 mt-6">All Groups</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={`skeleton-group-${index}-${Date.now()}`} className="overflow-hidden flex flex-col">
              <div className="h-40 overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : communities && communities.length > 0 ? (
          communities.map((community) => {
            const nameTag = community.tags.find(tag => tag[0] === "name");
            const descriptionTag = community.tags.find(tag => tag[0] === "description");
            const imageTag = community.tags.find(tag => tag[0] === "image");
            const dTag = community.tags.find(tag => tag[0] === "d");
            const moderatorTags = community.tags.filter(tag => tag[0] === "p" && tag[3] === "moderator");

            const name = nameTag ? nameTag[1] : (dTag ? dTag[1] : "Unnamed Group");
            const description = descriptionTag ? descriptionTag[1] : "No description available";
            const image = imageTag ? imageTag[1] : "/placeholder-community.jpg";
            const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
            
            const isPinned = isGroupPinned(communityId);

            const handleTogglePin = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (!user) {
                toast.error("Please log in to pin/unpin groups.");
                return;
              }
              if (isPinned) {
                unpinGroup(communityId);
              } else {
                pinGroup(communityId);
              }
            };

            return (
              <Card key={community.id} className={cn(
                "overflow-hidden flex flex-col relative group",
                isPinned && "ring-1 ring-primary/20"
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

                {user && (
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
                )}
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-10">
            <h2 className="text-xl font-semibold mb-2">No groups found</h2>
            <p className="text-muted-foreground mb-4">
              Be the first to create a group on this platform!
            </p>
            {user ? (
              null
            ) : (
              <p className="text-sm text-muted-foreground">
                Please log in to create a group
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
