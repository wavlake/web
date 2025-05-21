import { useUserGroups } from "@/hooks/useUserGroups";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePinnedGroups } from "@/hooks/usePinnedGroups";
import { MyGroupCard } from "./MyGroupCard";

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
    const dTag = community.tags.find((tag: string[]) => tag[0] === "d");
    const communityId = `34550:${community.pubkey}:${dTag ? dTag[1] : ""}`;
    const isPinned = isGroupPinned(communityId);
    
    return (
      <MyGroupCard
        key={community.id}
        community={community}
        role={role}
        isPinned={isPinned}
        pinGroup={pinGroup}
        unpinGroup={unpinGroup}
        isUpdating={isUpdating}
      />
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
            {userGroups?.pinned.map(community => (
              <MyGroupCard
                key={`pinned-${community.id}`}
                community={community}
                role="pinned"
                isPinned={isGroupPinned(`34550:${community.pubkey}:${community.tags.find(tag => tag[0] === "d")?.[1] || ""}`)}
                pinGroup={pinGroup}
                unpinGroup={unpinGroup}
                isUpdating={isUpdating}
              />
            ))}
            
            {/* Then other groups */}
            {userGroups?.owned.map(community => (
              <MyGroupCard
                key={`owned-${community.id}`}
                community={community}
                role="owner"
                isPinned={isGroupPinned(`34550:${community.pubkey}:${community.tags.find(tag => tag[0] === "d")?.[1] || ""}`)}
                pinGroup={pinGroup}
                unpinGroup={unpinGroup}
                isUpdating={isUpdating}
              />
            ))}
            {userGroups?.moderated.map(community => (
              <MyGroupCard
                key={`moderated-${community.id}`}
                community={community}
                role="moderator"
                isPinned={isGroupPinned(`34550:${community.pubkey}:${community.tags.find(tag => tag[0] === "d")?.[1] || ""}`)}
                pinGroup={pinGroup}
                unpinGroup={unpinGroup}
                isUpdating={isUpdating}
              />
            ))}
            {userGroups?.member.map(community => (
              <MyGroupCard
                key={`member-${community.id}`}
                community={community}
                role="member"
                isPinned={isGroupPinned(`34550:${community.pubkey}:${community.tags.find(tag => tag[0] === "d")?.[1] || ""}`)}
                pinGroup={pinGroup}
                unpinGroup={unpinGroup}
                isUpdating={isUpdating}
              />
            ))}
          </div>
      )}
    </div>
  );
}
