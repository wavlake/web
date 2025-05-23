import { useNostr } from "@/hooks/useNostr";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/ui/Header";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoteContent } from "@/components/NoteContent";
import { EmojiReactionButton } from "@/components/EmojiReactionButton";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowLeft, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { nip19 } from "nostr-tools";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Hashtag() {
  const { hashtag } = useParams<{ hashtag: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // Query for posts containing this hashtag
  const { data: posts, isLoading: isLoadingPosts, error } = useQuery({
    queryKey: ["hashtag-posts", hashtag],
    queryFn: async (c) => {
      if (!hashtag) return [];
      
      try {
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
        
        // Search for posts with the hashtag in multiple ways:
        // 1. As a 't' tag (standardized way per NIP-12)
        // 2. In the content text itself (for compatibility with older posts)
        const [taggedPosts, contentPosts] = await Promise.all([
          // Query for posts with hashtag as a 't' tag
          nostr.query([{
            kinds: [1, 11], // text notes and community posts
            "#t": [hashtag.toLowerCase()], 
            limit: 50
          }], { signal }),
          
          // Query for posts containing hashtag in content
          // Note: This is less efficient but catches posts without proper tagging
          nostr.query([{
            kinds: [1, 11],
            search: `#${hashtag}`,
            limit: 30
          }], { signal }).catch(() => []) // Some relays may not support search
        ]);

        // Combine results and deduplicate
        const allPosts = [...taggedPosts, ...contentPosts];
        const uniquePosts = allPosts.filter((post, index, self) =>
          index === self.findIndex(p => p.id === post.id)
        );

        // Further filter posts that actually contain the hashtag in content
        const filteredPosts = uniquePosts.filter(post => {
          const content = post.content.toLowerCase();
          const hashtagPattern = new RegExp(`#${hashtag.toLowerCase()}\\b`, 'i');
          return hashtagPattern.test(content) || 
                 post.tags.some(tag => tag[0] === 't' && tag[1] && tag[1].toLowerCase() === hashtag.toLowerCase());
        });

        return filteredPosts;
      } catch (error) {
        console.error("Error fetching hashtag posts:", error);
        return [];
      }
    },
    enabled: !!hashtag && !!nostr,
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000, // 1 minute
  });

  // Sort posts by creation time (newest first)
  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => b.created_at - a.created_at);
  }, [posts]);

  // Loading skeleton
  const renderSkeletons = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={`skeleton-${i}`} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center space-y-0 gap-3 pb-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!hashtag) {
    return (
      <div className="container mx-auto py-4 px-4">
        <Header />
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-red-500">Invalid hashtag</h1>
          <p className="text-muted-foreground mt-2">The hashtag parameter is missing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4">
      <Header />
      
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6 mt-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Go back</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <Hash className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">#{hashtag}</h1>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {isLoadingPosts ? "Loading..." : `${sortedPosts.length} post${sortedPosts.length !== 1 ? 's' : ''}`}
          </Badge>
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-4">
        {isLoadingPosts ? (
          renderSkeletons()
        ) : error ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error loading posts</h2>
            <p className="text-muted-foreground">
              There was an error fetching posts for this hashtag. Please try again later.
            </p>
          </Card>
        ) : sortedPosts.length === 0 ? (
          <Card className="p-8 text-center">
            <Hash className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No posts found</h2>
            <p className="text-muted-foreground mb-4">
              No posts containing <span className="font-semibold">#{hashtag}</span> were found.
            </p>
            <p className="text-sm text-muted-foreground">
              Be the first to post something with this hashtag!
            </p>
          </Card>
        ) : (
          sortedPosts.map((post) => (
            <HashtagPostItem key={post.id} post={post} hashtag={hashtag} />
          ))
        )}
      </div>
    </div>
  );
}

// Individual post component for hashtag feed
interface HashtagPostItemProps {
  post: NostrEvent;
  hashtag: string;
}

function HashtagPostItem({ post, hashtag }: HashtagPostItemProps) {
  const author = useAuthor(post.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || post.pubkey.slice(0, 12);
  const profileImage = metadata?.picture;

  // Format author identifier
  const authorIdentifier = useMemo(() => {
    const authorNip05 = metadata?.nip05;
    if (authorNip05) return authorNip05;
    
    if (post.pubkey.match(/^[0-9a-fA-F]{64}$/)) {
      try {
        const npub = nip19.npubEncode(post.pubkey);
        return `${npub.slice(0, 10)}...${npub.slice(-4)}`;
      } catch (e) {
        return `${post.pubkey.slice(0, 8)}...${post.pubkey.slice(-4)}`;
      }
    }
    return `${post.pubkey.slice(0, 8)}...${post.pubkey.slice(-4)}`;
  }, [post.pubkey, metadata?.nip05]);

  // Format timestamps
  const relativeTime = formatRelativeTime(post.created_at);
  const postDate = new Date(post.created_at * 1000);
  const formattedAbsoluteTime = `${postDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })} ${postDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  })}`;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start space-y-0 gap-3 pb-3">
        <Link to={`/profile/${post.pubkey}`} className="flex-shrink-0">
          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/profile/${post.pubkey}`} className="hover:underline">
              <span className="font-semibold text-sm">{displayName}</span>
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground hover:underline cursor-help">
                    {relativeTime}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formattedAbsoluteTime}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <span 
            className="text-xs text-muted-foreground truncate block max-w-full" 
            title={authorIdentifier}
          >
            {authorIdentifier}
          </span>
        </div>
        
        {/* Post type indicator */}
        <Badge variant="secondary" className="text-xs">
          {post.kind === 11 ? "Group" : "Note"}
        </Badge>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Post content */}
        <div className="mb-4">
          <NoteContent event={post} />
        </div>

        {/* Post actions */}
        <div className="flex items-center gap-4">
          <EmojiReactionButton postId={post.id} showText={true} />
        </div>
      </CardContent>
    </Card>
  );
}