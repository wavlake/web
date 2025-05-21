import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/ui/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { MyGroupsList } from "@/components/groups/MyGroupsList";
import { usePinnedGroups } from "@/hooks/usePinnedGroups";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { GroupCard } from "@/components/groups/GroupCard";

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
            const dTag = community.tags.find(tag => tag[0] === "d");
            const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
            const isPinned = isGroupPinned(communityId);
            
            return (
              <GroupCard 
                key={community.id}
                community={community}
                isPinned={isPinned}
                pinGroup={pinGroup}
                unpinGroup={unpinGroup}
                isUpdating={isUpdating}
              />
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
