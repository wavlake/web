import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { toast } from "sonner";
import { Heart, MessageSquare, Share2, CheckCircle } from "lucide-react";
import { NostrEvent } from "@nostrify/nostrify";
import { NoteContent } from "../NoteContent";

interface PostListProps {
  communityId: string;
  showOnlyApproved?: boolean;
}

export function PostList({ communityId, showOnlyApproved = false }: PostListProps) {
  const { nostr } = useNostr();
  
  // Query for approved posts
  const { data: approvedPosts, isLoading: isLoadingApproved } = useQuery({
    queryKey: ["approved-posts", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Get approval events
      const approvals = await nostr.query([{ 
        kinds: [4550],
        "#a": [communityId],
        limit: 50,
      }], { signal });
      
      // Extract the approved posts from the content field
      return approvals.map(approval => {
        try {
          // Parse the approved post from the content
          const approvedPost = JSON.parse(approval.content) as NostrEvent;
          // Add the approval information
          return {
            ...approvedPost,
            approval: {
              id: approval.id,
              pubkey: approval.pubkey,
              created_at: approval.created_at,
            }
          };
        } catch (error) {
          console.error("Error parsing approved post:", error);
          return null;
        }
      }).filter((post): post is NostrEvent & { 
        approval: { id: string; pubkey: string; created_at: number } 
      } => post !== null);
    },
    enabled: !!nostr && !!communityId,
  });
  
  // Query for pending posts (posts that tag the community but don't have approvals yet)
  const { data: pendingPosts, isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-posts", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Get posts that tag the community
      const posts = await nostr.query([{ 
        kinds: [1],
        "#a": [communityId],
        limit: 50,
      }], { signal });
      
      return posts;
    },
    enabled: !!nostr && !!communityId,
  });
  
  // Combine and sort all posts
  const allPosts = [...(approvedPosts || []), ...(pendingPosts || [])];
  
  // Remove duplicates (posts that are both in pending and approved)
  const uniquePosts = allPosts.filter((post, index, self) => 
    index === self.findIndex(p => p.id === post.id)
  );
  
  // Count approved and pending posts
  const approvedCount = uniquePosts.filter(post => 'approval' in post).length;
  const pendingCount = uniquePosts.length - approvedCount;
  
  // Filter posts based on approval status if showOnlyApproved is true
  const filteredPosts = showOnlyApproved 
    ? uniquePosts.filter(post => 'approval' in post)
    : uniquePosts;
  
  // Sort by created_at (newest first)
  const sortedPosts = filteredPosts.sort((a, b) => b.created_at - a.created_at);
  
  if (isLoadingApproved || isLoadingPending) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <div className="flex gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  if (sortedPosts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-2">
          {showOnlyApproved 
            ? "No approved posts in this community yet" 
            : "No posts in this community yet"}
        </p>
        <p className="text-sm">
          {showOnlyApproved && pendingCount > 0
            ? `There are ${pendingCount} pending posts waiting for approval.`
            : "Be the first to post something!"}
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          Showing {sortedPosts.length} {showOnlyApproved ? "approved" : ""} posts
        </div>
        
        <div className="flex gap-3 text-sm">
          <span className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
            {approvedCount} approved
          </span>
          {!showOnlyApproved && pendingCount > 0 && (
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>
      
      {sortedPosts.map((post) => (
        <PostItem 
          key={post.id} 
          post={post} 
          communityId={communityId}
          isApproved={'approval' in post}
        />
      ))}
    </div>
  );
}

interface PostItemProps {
  post: NostrEvent & { approval?: { id: string; pubkey: string; created_at: number } };
  communityId: string;
  isApproved: boolean;
}

function PostItem({ post, communityId, isApproved }: PostItemProps) {
  const author = useAuthor(post.pubkey);
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || post.pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  
  // Check if user is a moderator (for approving posts)
  const isModerator = user && post.tags
    .filter(tag => tag[0] === "p" && tag[3] === "moderator")
    .some(tag => tag[1] === user.pubkey);
  
  const handleApprovePost = async () => {
    if (!user) {
      toast.error("You must be logged in to approve posts");
      return;
    }
    
    try {
      // Create approval event (kind 4550)
      await publishEvent({
        kind: 4550,
        tags: [
          ["a", communityId],
          ["e", post.id],
          ["p", post.pubkey],
          ["k", "1"], // Post kind
        ],
        content: JSON.stringify(post),
      });
      
      toast.success("Post approved successfully!");
    } catch (error) {
      console.error("Error approving post:", error);
      toast.error("Failed to approve post. Please try again.");
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <Avatar>
          <AvatarImage src={profileImage} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{displayName}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{new Date(post.created_at * 1000).toLocaleString()}</span>
                {isApproved ? (
                  <span className="ml-2 text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </span>
                ) : (
                  <span className="ml-2 text-amber-600 dark:text-amber-400 flex items-center">
                    <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
                    Pending approval
                  </span>
                )}
              </div>
            </div>
            
            {user && isModerator && !isApproved && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleApprovePost}
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="whitespace-pre-wrap break-words">
          <NoteContent event={post} className="text-sm" />
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex gap-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Heart className="h-4 w-4 mr-2" />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}