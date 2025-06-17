import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { CommunityProfileHeader } from "@/components/groups/CommunityProfileHeader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveTabNavigation,
  TabItem,
} from "@/components/ResponsiveTabNavigation";
import {
  Home,
  Music,
  Radio,
  Bell,
  Users,
  Calendar,
  ShoppingBag,
  ExternalLink,
  Mail,
} from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useApprovedMembers } from "@/hooks/useApprovedMembers";
import { CreatePostForm } from "@/components/groups/CreatePostForm";
import { PostList } from "@/components/groups/PostList";
import { SimpleMembersList } from "@/components/groups/SimpleMembersList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseNostrAddress } from "@/lib/nostr-utils";
import { Layout } from "@/components/Layout";
import { useAuthor } from "@/hooks/useAuthor";
import { RichText } from "@/components/ui/RichText";
import { useIsGroupDeleted } from "@/hooks/useGroupDeletionRequests";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { KINDS } from "@/lib/nostr-kinds";
import { MusicSection } from "@/components/music/MusicSection";
import { useArtistAlbums } from "@/hooks/useArtistAlbums";
import { useArtistTracks } from "@/hooks/useArtistTracks";

// Dashboard navigation items for the tabs
const groupTabs: TabItem[] = [
  {
    label: "Home",
    value: "home",
    icon: Home,
  },
  {
    label: "Music",
    value: "music",
    icon: Music,
  },
  {
    label: "Updates",
    value: "updates",
    icon: Bell,
  },
  {
    label: "Community",
    value: "community",
    icon: Users,
  },
  {
    label: "Links",
    value: "links",
    icon: ExternalLink,
  },
  {
    label: "Contact",
    value: "contact",
    icon: Mail,
  },
];

interface GroupDetailProps {
  groupId?: string;
}

export default function GroupDetail({
  groupId: propGroupId,
}: GroupDetailProps = {}) {
  const { groupId: paramGroupId } = useParams<{ groupId: string }>();
  const groupId = propGroupId || paramGroupId;
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("home");
  const [postFilter, setPostFilter] = useState<"all" | "approved" | "pending">(
    "approved"
  );
  const [parsedId, setParsedId] = useState<{
    kind: number;
    pubkey: string;
    identifier: string;
  } | null>(null);

  const { user } = useCurrentUser();

  useEffect(() => {
    if (groupId) {
      const parsed = parseNostrAddress(decodeURIComponent(groupId));
      if (parsed) {
        setParsedId(parsed);
      }
    }
  }, [groupId]);

  // Check URL hash for initial tab on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const validTab = groupTabs.find((tab) => tab.value === hash);
    if (validTab) {
      setActiveTab(hash);
    }
  }, []);

  // Handle tab change with URL hash update
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    window.history.replaceState(null, "", `#${newTab}`);
  };

  const { data: community, isLoading: isLoadingCommunity } = useGroup(groupId);

  // Check if group has been deleted
  const { isDeleted: isGroupDeleted, deletionRequest } = useIsGroupDeleted(
    parsedId
      ? `${KINDS.GROUP}:${parsedId.pubkey}:${parsedId.identifier}`
      : undefined
  );

  // Get user role for this community
  const { data: userRole } = useUserRole(groupId || "");

  const isOwner = userRole === "owner";
  const isModerator = userRole === "moderator" || userRole === "owner";

  // Get approved members
  const { approvedMembers } = useApprovedMembers(groupId || "");

  const { data: albums = [], isLoading: isLoadingAlbums } = useArtistAlbums(
    parsedId?.pubkey || ""
  );
  const { data: tracks = [], isLoading: isLoadingTracks } = useArtistTracks(
    parsedId?.pubkey || ""
  );

  // Get artist data from community metadata
  const artist = {
    name:
      community?.tags.find((tag) => tag[0] === "name")?.[1] ||
      parsedId?.identifier ||
      "Unknown Artist",
    username:
      community?.tags
        .find((tag) => tag[0] === "name")?.[1]
        ?.toLowerCase()
        .replace(/\s+/g, "") || "artist",
    npub: community?.pubkey || "",
    nip05: "",
    bio:
      community?.tags.find((tag) => tag[0] === "description")?.[1] ||
      "Artist on Wavlake",
    location: "",
    website: "",
    profileImage:
      community?.tags.find((tag) => tag[0] === "image")?.[1] ||
      "/placeholder.svg",
    bannerImage:
      community?.tags.find((tag) => tag[0] === "image")?.[1] ||
      "/placeholder.svg",
    verified: false,
  };

  if (!groupId) {
    return (
      <div className="flex flex-col w-full">
        <div className="w-full max-w-7xl px-4 py-6 mx-auto">
          <div className="text-center py-8 text-muted-foreground">
            Group ID not found.
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingCommunity || !parsedId) {
    return (
      <div className="flex flex-col w-full">
        <div className="w-full max-w-7xl px-4 py-6 mx-auto">
          <div className="text-center py-8 text-muted-foreground">
            Loading artist profile...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!community) {
    return (
      <div className="flex flex-col w-full">
        <div className="w-full max-w-7xl px-4 py-6 mx-auto">
          <div className="text-center py-8 text-destructive">
            Failed to load artist profile. Please try again.
          </div>
        </div>
      </div>
    );
  }

  // Show deletion notice if group has been deleted
  if (isGroupDeleted && deletionRequest) {
    return (
      <div className="flex flex-col w-full">
        <div className="w-full max-w-7xl px-4 py-6 mx-auto">
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="font-semibold">This group has been deleted</div>
              <p>
                The group owner has requested deletion of this group on{" "}
                {new Date(
                  deletionRequest.deletionEvent.created_at * 1000
                ).toLocaleDateString()}
                .
              </p>
              {deletionRequest.reason && (
                <p className="text-sm text-muted-foreground">
                  <strong>Reason:</strong> {deletionRequest.reason}
                </p>
              )}
              <div className="pt-2">
                <Button asChild>
                  <a href="/groups">Browse Other Groups</a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <Layout className="flex flex-col w-full">
      <CommunityProfileHeader
        communityId={groupId || ""}
        name={artist.name}
        username={artist.username}
        npub={artist.npub}
        nip05={artist.nip05}
        bio={artist.bio}
        location={artist.location}
        website={artist.website}
        profileImage={artist.profileImage}
        bannerImage={artist.bannerImage}
        verified={artist.verified}
      />

      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 mx-auto">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="w-full xl:w-2/3">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <ResponsiveTabNavigation
                tabs={groupTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                forceHorizontal={true}
              />

              <TabsContent value="home">
                <div className="space-y-6">
                  <div className="bg-background p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-bold mb-4">
                      About {artist.name}
                    </h2>
                    <p className="text-muted-foreground mb-4">{artist.bio}</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">
                          Your membership:
                        </span>{" "}
                        {user
                          ? isOwner
                            ? "Owner"
                            : isModerator
                            ? "Moderator"
                            : "Member"
                          : "Not logged in"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Latest Updates</h3>
                    <div className="max-w-3xl mx-auto">
                      <PostList
                        communityId={groupId || ""}
                        showOnlyApproved={true}
                        onPostCountChange={() => {}}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="community">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Community Posts</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          variant={
                            postFilter === "approved" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPostFilter("approved")}
                        >
                          Approved
                        </Button>
                        <Button
                          variant={postFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPostFilter("all")}
                        >
                          All Posts
                        </Button>
                        <Button
                          variant={
                            postFilter === "pending" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPostFilter("pending")}
                        >
                          Pending
                        </Button>
                      </div>
                    </div>
                  </div>

                  {user && (
                    <div className="max-w-3xl mx-auto">
                      <CreatePostForm
                        communityId={groupId || ""}
                        onPostSuccess={() => {}}
                      />
                    </div>
                  )}

                  <div className="max-w-3xl mx-auto">
                    <PostList
                      communityId={groupId || ""}
                      showOnlyApproved={postFilter === "approved"}
                      onPostCountChange={() => {}}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="music">
                {isLoadingAlbums || isLoadingTracks ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading music...
                  </div>
                ) : (
                  <MusicSection albums={albums} allTracks={tracks} />
                )}
              </TabsContent>

              <TabsContent value="updates">
                <div className="bg-background p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-bold mb-4">Artist Updates</h2>
                  <p className="text-muted-foreground">
                    Updates coming soon...
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="links">
                <div className="bg-background p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-bold mb-4">Links</h2>
                  <p className="text-muted-foreground">Links coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="contact">
                <div className="bg-background p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-bold mb-4">Contact</h2>
                  <p className="text-muted-foreground">
                    Contact information coming soon...
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="hidden xl:block w-full xl:w-1/3">
            <div className="bg-background p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Community Info</h3>
              <SimpleMembersList communityId={groupId || ""} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
