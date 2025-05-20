import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Separator } from "@/components/ui/separator"; // Removed
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthor } from "@/hooks/useAuthor";
import { CreatePostForm } from "@/components/groups/CreatePostForm";
import { PostList } from "@/components/groups/PostList";
import { JoinRequestButton } from "@/components/groups/JoinRequestButton";
import { MemberManagement } from "@/components/groups/MemberManagement";
import { ApprovedMembersList } from "@/components/groups/ApprovedMembersList";
import { Users, Settings, Info, MessageSquare, CheckCircle, UserPlus } from "lucide-react";
import { parseNostrAddress } from "@/lib/nostr-utils";
import Header from "@/components/ui/Header";

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [parsedId, setParsedId] = useState<{ kind: number; pubkey: string; identifier: string } | null>(null);
  const [showOnlyApproved, setShowOnlyApproved] = useState(true);
  const [currentPostCount, setCurrentPostCount] = useState(0); // Added state for post count

  useEffect(() => {
    if (groupId) {
      const parsed = parseNostrAddress(decodeURIComponent(groupId));
      if (parsed) {
        setParsedId(parsed);
      }
    }
  }, [groupId]);

  const { data: community, isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["community", parsedId?.pubkey, parsedId?.identifier],
    queryFn: async (c) => {
      if (!parsedId) throw new Error("Invalid community ID");

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [34550],
        authors: [parsedId.pubkey],
        "#d": [parsedId.identifier]
      }], { signal });

      if (events.length === 0) throw new Error("Community not found");
      return events[0];
    },
    enabled: !!nostr && !!parsedId,
  });

  const isOwner = user && community && user.pubkey === community.pubkey;
  const isModerator = isOwner || (user && community?.tags
    .filter(tag => tag[0] === "p" && tag[3] === "moderator")
    .some(tag => tag[1] === user.pubkey));

  console.log("Current user pubkey:", user?.pubkey);
  console.log("Community creator pubkey:", community?.pubkey);
  console.log("Is owner:", isOwner);
  console.log("Is moderator:", isModerator);

  const nameTag = community?.tags.find(tag => tag[0] === "name");
  const descriptionTag = community?.tags.find(tag => tag[0] === "description");
  const imageTag = community?.tags.find(tag => tag[0] === "image");
  const moderatorTags = community?.tags.filter(tag => tag[0] === "p" && tag[3] === "moderator") || [];

  const name = nameTag ? nameTag[1] : (parsedId?.identifier || "Unnamed Community");
  const description = descriptionTag ? descriptionTag[1] : "No description available";
  const image = imageTag ? imageTag[1] : "/placeholder-community.jpg";

  if (isLoadingCommunity || !parsedId) {
    return (
      <div className="container mx-auto py-4 px-6">
        <Header />
        <h1 className="text-2xl font-bold mb-4">Loading community...</h1>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto py-4 px-6">
        <h1 className="text-2xl font-bold mb-4">Community not found</h1>
        <p>The community you're looking for doesn't exist or has been deleted.</p>
        <Button asChild className="mt-4">
          <Link to="/groups">Back to Communities</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-6">
      <Header />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2">
          <div className="h-48 rounded-lg overflow-hidden mb-4"> {/* Changed mb-1.5 to mb-4 */}
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/1200x400?text=Community";
              }}
            />
          </div>
          <p className="text-lg mb-3">{description}</p>
        </div>

        <div>
          {isModerator ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  {isOwner ? "Owner Controls" : "Moderator Controls"}
                </CardTitle>
                <CardDescription>
                  {isOwner
                    ? "You are the owner of this community"
                    : "You are a moderator of this community"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/group/${encodeURIComponent(groupId || '')}/settings`} className="w-full flex items-center justify-center gap-2">
                    <Settings className="h-4 w-4" />
                    Manage Community
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Join this group
                </CardTitle>
                <CardDescription>
                  Request to join this community to participate in discussions
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <JoinRequestButton communityId={groupId || ''} isModerator={isModerator} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">
            <MessageSquare className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="h-4 w-4 mr-2" />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {user && (
            <CreatePostForm communityId={groupId || ''} />
          )}

          {/* Modified section for showing post count and toggle */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="text-sm text-muted-foreground">
              Showing {currentPostCount} {showOnlyApproved && currentPostCount > 0 ? "approved" : ""} post{currentPostCount !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="approved-only"
                checked={showOnlyApproved}
                onCheckedChange={setShowOnlyApproved}
              />
              <Label htmlFor="approved-only" className="flex items-center cursor-pointer">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Show only approved posts
              </Label>
            </div>
          </div>

          <PostList 
            communityId={groupId || ''} 
            showOnlyApproved={showOnlyApproved} 
            onPostCountChange={setCurrentPostCount} // Passed callback
          />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {isModerator && (
            <MemberManagement communityId={groupId || ''} isModerator={isModerator} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Group Owner & Moderators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {community && <ModeratorItem key={community.pubkey} pubkey={community.pubkey} isCreator />}
                  {moderatorTags
                    .filter(tag => tag[1] !== community?.pubkey) 
                    .map((tag) => (
                      <ModeratorItem key={tag[1]} pubkey={tag[1]} />
                    ))}
                </div>
              </CardContent>
            </Card>

            <ApprovedMembersList communityId={groupId || ''} />
          </div>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About this Community</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Description</h3>
                <p>{description}</p>
              </div>
              {community && (
                <>
                  <div>
                    <h3 className="font-medium">Created by</h3>
                    <ModeratorItem pubkey={community.pubkey} isCreator />
                  </div>
                  <div>
                    <h3 className="font-medium">Created at</h3>
                    <p>{new Date(community.created_at * 1000).toLocaleString()}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModeratorItem({ pubkey, isCreator = false }: { pubkey: string; isCreator?: boolean }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || pubkey.slice(0, 8);
  const profileImage = metadata?.picture;

  return (
    <Link to={`/profile/${pubkey}`} className="block hover:bg-muted rounded-md transition-colors">
      <div className="flex items-center space-x-3 p-2">
        <Avatar>
          <AvatarImage src={profileImage} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName}</p>
          {isCreator ? (
            <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2 py-0.5">
              Group Owner
            </span>
          ) : (
            <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">
              Moderator
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
