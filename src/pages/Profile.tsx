import { useParams } from "react-router-dom";
import { useAuthor } from "@/hooks/useAuthor";
import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { 
  Card, 
  CardHeader, 
  CardContent
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NoteContent } from "@/components/NoteContent";
import { Link } from "react-router-dom";
import { 
  ExternalLink, 
  Copy, 
  Users, 
  Pencil,
  Calendar, 
  MessageCircle,
  Heart,
  Share2,
  LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import type { NostrEvent } from "@nostrify/nostrify";
import { parseNostrAddress } from "@/lib/nostr-utils";
import Header from "@/components/ui/Header";
import { VerifiedNip05 } from "@/components/VerifiedNip05";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper function to extract group information from a post
function extractGroupInfo(post: NostrEvent): { groupId: string; groupName: string } | null {
  // Find the "a" tag that matches the group format
  const groupTag = post.tags.find(tag => {
    return tag[0] === "a" && tag[1].startsWith("34550:");
  });

  if (!groupTag) return null;

  const groupId = groupTag[1];

  // Parse the Nostr address to extract components
  const parsedAddress = parseNostrAddress(groupId);

  if (parsedAddress && parsedAddress.kind === 34550) {
    return {
      groupId,
      groupName: parsedAddress.identifier // The identifier part is often the group name
    };
  }

  // Fallback to simple string splitting if parsing fails
  const parts = groupId.split(":");
  if (parts.length >= 3) {
    return {
      groupId,
      groupName: parts[2] // The identifier part is often the group name
    };
  }

  return {
    groupId,
    groupName: "Group" // Fallback name if we can't extract it
  };
}

// Component to display group information on a post
function PostGroupLink({ post }: { post: NostrEvent }) {
  const groupInfo = extractGroupInfo(post);

  if (!groupInfo) return null;

  return (
    <Link
      to={`/group/${encodeURIComponent(groupInfo.groupId)}`}
      className="flex items-center text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <div className="flex items-center px-2 py-1 rounded-full bg-muted/70 hover:bg-muted transition-colors">
        <Users className="h-3 w-3 md:h-4 md:w-4 mr-1.5" />
        <span className="font-medium">{groupInfo.groupName}</span>
      </div>
    </Link>
  );
}

// Formatted date component
function FormattedDate({ timestamp }: { timestamp: number }) {
  const date = new Date(timestamp * 1000);
  
  // Format relative time (e.g., "2 hours ago")
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let relativeTime = '';
  
  if (diffInSeconds < 60) {
    relativeTime = rtf.format(-Math.floor(diffInSeconds), 'second');
  } else if (diffInSeconds < 3600) {
    relativeTime = rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    relativeTime = rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 604800) {
    relativeTime = rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 2592000) {
    relativeTime = rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
  } else if (diffInSeconds < 31536000) {
    relativeTime = rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    relativeTime = rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
  
  // Format absolute date (shown on hover)
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  const formattedDate = date.toLocaleString('en-US', formatOptions);
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 mr-1.5 inline-block" />
            {relativeTime}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{formattedDate}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Component to display the user's groups
interface UserGroup {
  id: string;
  name: string;
  description: string;
  image: string;
  membershipEvent: NostrEvent;
  groupEvent: NostrEvent;
}

function UserGroupsList({
  groups,
  isLoading
}: {
  groups: UserGroup[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="p-6 text-center bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">This user is not a member of any groups yet</p>
      </div>
    );
  }

  // Create a map to deduplicate groups by ID
  const uniqueGroups = new Map<string, UserGroup>();
  for (const group of groups) {
    // Only add if not already in the map, or replace with newer version
    if (
      !uniqueGroups.has(group.id) ||
      (group.groupEvent.created_at > (uniqueGroups.get(group.id)?.groupEvent.created_at ?? 0))
    ) {
      uniqueGroups.set(group.id, group);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from(uniqueGroups.values()).map((group) => (
        <Link
          key={group.id}
          to={`/group/${encodeURIComponent(group.id)}`}
          className="block"
        >
          <Card className="overflow-hidden border border-border/40 hover:border-border hover:shadow-sm transition-all duration-200">
            <div className="flex p-4">
              <div className="h-14 w-14 rounded-lg overflow-hidden mr-4 flex-shrink-0 bg-muted">
                <img
                  src={group.image}
                  alt={group.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-community.svg";
                  }}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-0.5">{group.name}</h3>
                <p className="text-xs leading-snug text-muted-foreground line-clamp-2">
                  {group.description || "No description available"}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function PostCard({ post, profileImage, displayName, displayNameFull }: { 
  post: NostrEvent; 
  profileImage?: string;
  displayName: string;
  displayNameFull: string;
}) {
  return (
    <Card className="overflow-hidden border border-border/40 hover:border-border hover:shadow-sm transition-all duration-300 mb-5">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage src={profileImage} />
            <AvatarFallback className="bg-primary/10">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-0.5">
              <span className="font-medium text-base">{displayNameFull}</span>
              <FormattedDate timestamp={post.created_at} />
            </div>
            
            <div className="mt-2 whitespace-pre-wrap break-words">
              <NoteContent event={post} className="text-base leading-relaxed" />
            </div>
            
            {extractGroupInfo(post) && (
              <div className="mt-2">
                <PostGroupLink post={post} />
              </div>
            )}
            
            <div className="mt-2 pt-3 border-t flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-5">
                <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">Reply</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground">
                  <Heart className="h-4 w-4" />
                  <span className="text-xs">Like</span>
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const author = useAuthor(pubkey);
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // Query for user's posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["user-posts", pubkey],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Get posts by this user
      const userPosts = await nostr.query([{
        kinds: [11],
        authors: [pubkey],
        limit: 20,
      }], { signal });

      return userPosts.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!nostr && !!pubkey,
  });

  // Query for groups the user is a part of
  const { data: userGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["user-groups-profile", pubkey],
    queryFn: async (c) => {
      if (!pubkey || !nostr) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // First, check if this is the current user - if so, we can use a more efficient approach
      const isCurrentUserProfile = user && pubkey === user.pubkey;

      const groupEvents: NostrEvent[] = [];

      if (isCurrentUserProfile) {
        // For current user, get all communities they're part of from various sources

        // Get communities where user is owner or moderator
        const ownedOrModeratedEvents = await nostr.query([{
          kinds: [34550],
          authors: [pubkey], // Communities they created
          limit: 50,
        }], { signal });

        groupEvents.push(...ownedOrModeratedEvents);

        // Get communities where user is a moderator but not owner
        const moderatedEvents = await nostr.query([{
          kinds: [34550],
          "#p": [pubkey],
          limit: 50,
        }], { signal });

        // Filter to only include events where user is tagged as moderator
        const moderatorEvents = moderatedEvents.filter(event =>
          event.pubkey !== pubkey && // Not already counted as owned
          event.tags.some(tag =>
            tag[0] === "p" &&
            tag[1] === pubkey &&
            tag[3] === "moderator"
          )
        );

        groupEvents.push(...moderatorEvents);

        // Get communities where user is a member
        const membershipEvents = await nostr.query([{
          kinds: [14550],
          "#p": [pubkey],
          limit: 50,
        }], { signal });

        // For each membership event, get the community details
        for (const event of membershipEvents) {
          const aTag = event.tags.find(tag => tag[0] === "a");
          if (!aTag || !aTag[1]) continue;

          const groupId = aTag[1];
          const parsedGroup = parseNostrAddress(groupId);

          if (!parsedGroup || parsedGroup.kind !== 34550) continue;

          // Fetch the group details if we don't already have it
          const existingGroup = groupEvents.find(g => {
            const dTag = g.tags.find(tag => tag[0] === "d");
            return g.pubkey === parsedGroup.pubkey && dTag && dTag[1] === parsedGroup.identifier;
          });

          if (!existingGroup) {
            const [groupEvent] = await nostr.query([{
              kinds: [34550],
              authors: [parsedGroup.pubkey],
              "#d": [parsedGroup.identifier],
              limit: 1,
            }], { signal: AbortSignal.timeout(3000) });

            if (groupEvent) {
              groupEvents.push(groupEvent);
            }
          }
        }
      } else {
        // For other users, get membership events
        const membershipEvents = await nostr.query([{
          kinds: [14550],
          "#p": [pubkey],
          limit: 50,
        }], { signal });

        // For each membership event, get the community details
        for (const event of membershipEvents) {
          const aTag = event.tags.find(tag => tag[0] === "a");
          if (!aTag || !aTag[1]) continue;

          const groupId = aTag[1];
          const parsedGroup = parseNostrAddress(groupId);

          if (!parsedGroup || parsedGroup.kind !== 34550) continue;

          // Fetch the group details
          const [groupEvent] = await nostr.query([{
            kinds: [34550],
            authors: [parsedGroup.pubkey],
            "#d": [parsedGroup.identifier],
            limit: 1,
          }], { signal: AbortSignal.timeout(3000) });

          if (groupEvent) {
            groupEvents.push(groupEvent);
          }
        }

        // Also get communities they created
        const ownedEvents = await nostr.query([{
          kinds: [34550],
          authors: [pubkey],
          limit: 50,
        }], { signal });

        groupEvents.push(...ownedEvents);
      }

      // Deduplicate groups by their unique ID
      const uniqueGroups = new Map<string, NostrEvent>();
      for (const event of groupEvents) {
        const dTag = event.tags.find(tag => tag[0] === "d");
        if (!dTag) continue;

        const groupId = `34550:${event.pubkey}:${dTag[1]}`;
        uniqueGroups.set(groupId, event);
      }

      // Convert to UserGroup format
      return Array.from(uniqueGroups.entries()).map(([id, event]) => {
        const nameTag = event.tags.find(tag => tag[0] === "name");
        const descriptionTag = event.tags.find(tag => tag[0] === "description");
        const imageTag = event.tags.find(tag => tag[0] === "image");
        const dTag = event.tags.find(tag => tag[0] === "d");

        return {
          id,
          name: nameTag ? nameTag[1] : (dTag ? dTag[1] : "Unnamed Group"),
          description: descriptionTag ? descriptionTag[1] : "",
          image: imageTag ? imageTag[1] : "/placeholder-group.jpg",
          membershipEvent: event, // Using the group event as membership event
          groupEvent: event,
        };
      });
    },
    enabled: !!nostr && !!pubkey,
  });

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || pubkey?.slice(0, 8) || "";
  const displayNameFull = metadata?.display_name || displayName;
  const profileImage = metadata?.picture;
  const about = metadata?.about;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;
  const banner = metadata?.banner;

  // Check if this is the current user's profile
  const isCurrentUser = user && pubkey === user.pubkey;

  const copyPubkeyToClipboard = () => {
    if (pubkey) {
      navigator.clipboard.writeText(pubkey);
      toast.success("Public key copied to clipboard");
    }
  };

  if (author.isLoading) {
    return (
      <div className="container mx-auto py-1 px-3 sm:px-4">
        <Header />
        <div className="space-y-6 my-6">
          {/* Banner skeleton */}
          <div className="w-full h-48 rounded-xl bg-muted/50 overflow-hidden mb-8"></div>
          
          {/* Profile info skeleton */}
          <div className="relative max-w-5xl mx-auto -mt-24 mb-8">
            <div className="bg-background rounded-xl border shadow-sm p-8">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <Skeleton className="h-32 w-32 rounded-full border-4 border-background -mt-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-64" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              </div>
              
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl" />
                <Skeleton className="h-4 w-5/6 max-w-2xl" />
                <Skeleton className="h-4 w-4/6 max-w-xl" />
              </div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="max-w-5xl mx-auto">
            <div className="border-b mb-8">
              <div className="flex gap-8">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div>
                <Skeleton className="h-8 w-40 mb-4" />
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="flex p-4">
                        <Skeleton className="h-14 w-14 rounded-lg mr-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-1 px-3 sm:px-4">
      <Header />
      
      {/* Profile Banner */}
      <div className="w-full h-48 md:h-64 rounded-xl bg-muted/50 overflow-hidden mt-3 mb-8">
        {banner ? (
          <img 
            src={banner} 
            alt={`${displayNameFull}'s banner`} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/5 to-primary/10" />
        )}
      </div>
      
      {/* Profile Info Card - Elevated above content */}
      <div className="relative max-w-5xl mx-auto -mt-24 mb-8">
        <div className="bg-background rounded-xl border shadow-md p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Large Avatar that overlaps the top of the card */}
            <Avatar className="h-32 w-32 rounded-full border-4 border-background -mt-20 md:-mt-28 shadow-md">
              <AvatarImage src={profileImage} />
              <AvatarFallback className="text-2xl bg-primary/10">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-1.5 md:space-y-2">
              {/* Name and verification */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{displayNameFull}</h1>
                {nip05 && (
                  <VerifiedNip05 nip05={nip05} pubkey={pubkey || ""} />
                )}
              </div>
              
              {/* Username */}
              {displayName !== displayNameFull && (
                <p className="text-base text-muted-foreground">@{displayName}</p>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                {isCurrentUser ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5"
                    asChild
                  >
                    <Link to="/settings/profile">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Profile
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-full"
                  >
                    Follow
                  </Button>
                )}
                
                {/* Copy Public Key button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={copyPubkeyToClipboard}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                  <span className="hidden sm:inline truncate max-w-[60px] md:max-w-[120px]">
                    {pubkey?.slice(0, 8)}...
                  </span>
                </Button>
                
                {/* Website link */}
                {website && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5"
                    asChild
                  >
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[140px]">{website}</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* About section */}
          {about && (
            <div className="mt-3 text-base whitespace-pre-wrap max-w-3xl">
              {about}
            </div>
          )}
        </div>
      </div>
      
      {/* Content Tabs - Posts and Groups */}
      <div className="max-w-5xl mx-auto">
        <Tabs defaultValue="posts" className="mb-8">
          <TabsList className="mb-8 border-b rounded-none w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="posts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-1 px-4 text-base"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="groups"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-1 px-4 text-base"
            >
              Groups
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-0">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Posts Column - Wider */}
              <div className="md:col-span-2">
                {isLoadingPosts ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="overflow-hidden border border-border/40">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-20" />
                              </div>
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                              <Skeleton className="h-4 w-2/3" />
                              <div className="pt-3 flex justify-between">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-20" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : posts && posts.length > 0 ? (
                  <div className="space-y-5">
                    {posts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        profileImage={profileImage}
                        displayName={displayName}
                        displayNameFull={displayNameFull}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="overflow-hidden border border-border/40">
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No posts from this user yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Sidebar */}
              <div>
                <div className="sticky top-4">
                  <h2 className="text-xl font-semibold mb-4">Groups</h2>
                  <UserGroupsList groups={userGroups} isLoading={isLoadingGroups} />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="groups" className="mt-0">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">All Groups</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <UserGroupsList groups={userGroups} isLoading={isLoadingGroups} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}