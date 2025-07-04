import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Crown, Shield, Users } from "lucide-react";
import { useCommunityContext } from "@/contexts/CommunityContext";

export function DashboardList() {
  const navigate = useNavigate();
  const { communities, getCommunityId, getCommunityName, isLoading } =
    useCommunityContext();

  // Show loading state while communities are being fetched
  if (isLoading) {
    return (
      <div className="my-6 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    );
  }

  // Show welcome page for users with no manageable communities
  if (communities.manageable.length === 0) {
    return (
      <div className="my-6">
          <div className="space-y-6">
            {/* Welcome Message for New Users */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center py-16">
                <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  Welcome to Your Artist Dashboard
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                  Start building your music community by creating your artist
                  page. Connect with fans, share your music, and grow your
                  audience on the decentralized web.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    onClick={() => navigate("/create-artist")}
                    className="text-lg px-8 py-3"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your Artist Page
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Benefits of Creating Artist Page */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">Build Community</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create a dedicated space for your fans to discover your
                    music and connect with each other.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Full Control</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Own your content and community on the decentralized web
                    without platform restrictions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">Share Music</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload and distribute your music directly to your community
                    and the Nostr network.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    );
  }

  // Show Dashboard List for users with manageable communities
  return (
    <div className="my-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Artist Pages</CardTitle>
            <CardDescription>
              Select an artist page to manage or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owned Communities */}
            {communities.owned.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Owned Pages
                </h3>
                <div className="grid gap-3">
                  {communities.owned.map((community) => {
                    const communityId = getCommunityId(community);
                    const name = getCommunityName(community);
                    const image = community.tags.find(
                      (tag) => tag[0] === "image"
                    )?.[1];

                    console.log("DashboardList Debug:", {
                      communityId,
                      name,
                      community,
                    });

                    return (
                      <Card
                        key={communityId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div
                            className="flex items-center justify-between"
                            onClick={() =>
                              navigate(
                                `/dashboard/${encodeURIComponent(communityId)}`
                              )
                            }
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={image} alt={name} />
                                <AvatarFallback>
                                  {name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Owner
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              Manage
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Moderated Communities */}
            {communities.moderated.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Moderated Pages
                </h3>
                <div className="grid gap-3">
                  {communities.moderated.map((community) => {
                    const communityId = getCommunityId(community);
                    const name = getCommunityName(community);
                    const image = community.tags.find(
                      (tag) => tag[0] === "image"
                    )?.[1];

                    return (
                      <Card
                        key={communityId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div
                            className="flex items-center justify-between"
                            onClick={() =>
                              navigate(
                                `/dashboard/${encodeURIComponent(communityId)}`
                              )
                            }
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={image} alt={name} />
                                <AvatarFallback>
                                  {name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Moderator
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              Manage
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create New Artist Page */}
            <Card className="border-dashed border-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div
                  className="flex flex-col items-center text-center"
                  onClick={() => navigate("/create-artist")}
                >
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium mb-1">Create New Artist Page</h4>
                  <p className="text-sm text-muted-foreground">
                    Start a new artist community
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
  );
}
