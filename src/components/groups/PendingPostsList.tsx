import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostList } from "./PostList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

interface PendingPostsListProps {
  communityId: string;
}

export function PendingPostsList({ communityId }: PendingPostsListProps) {
  const { nostr } = useNostr();
  
  // Query for pending posts count - using the same query key as in GroupDetail.tsx
  const { data: pendingPostsCount = 0, isLoading } = useQuery({
    queryKey: ["pending-posts-count", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Get posts that tag the community
      const posts = await nostr.query([{ 
        kinds: [1, 11],
        "#a": [communityId],
        limit: 100,
      }], { signal });
      
      // Get approval events
      const approvals = await nostr.query([{ 
        kinds: [4550],
        "#a": [communityId],
        limit: 100,
      }], { signal });
      
      // Get removal events
      const removals = await nostr.query([{ 
        kinds: [4551],
        "#a": [communityId],
        limit: 100,
      }], { signal });
      
      // Extract the approved post IDs
      const approvedPostIds = approvals.map(approval => {
        const eventTag = approval.tags.find(tag => tag[0] === "e");
        return eventTag ? eventTag[1] : null;
      }).filter((id): id is string => id !== null);
      
      // Extract the removed post IDs
      const removedPostIds = removals.map(removal => {
        const eventTag = removal.tags.find(tag => tag[0] === "e");
        return eventTag ? eventTag[1] : null;
      }).filter((id): id is string => id !== null);
      
      // Filter out posts that are already approved or removed
      const pendingPosts = posts.filter(post => 
        !approvedPostIds.includes(post.id) && 
        !removedPostIds.includes(post.id)
      );
      
      return pendingPosts.length;
    },
    enabled: !!nostr && !!communityId,
    staleTime: 30000, // Cache for 30 seconds to reduce duplicate queries
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 mb-4" />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pending Posts</h2>
        <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full text-sm font-medium">
          {pendingPostsCount} pending
        </div>
      </div>
      
      {!pendingPostsCount || pendingPostsCount === 0 ? (
        <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>No pending posts</AlertTitle>
          <AlertDescription>
            All posts have been reviewed. There are currently no posts waiting for approval in this community.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pending Approval</AlertTitle>
            <AlertDescription>
              These posts are waiting for moderator approval before they will be visible to all community members.
            </AlertDescription>
          </Alert>
          
          <PostList 
            communityId={communityId} 
            showOnlyApproved={false} 
            pendingOnly={true}
          />
        </>
      )}
    </div>
  );
}