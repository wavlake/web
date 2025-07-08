import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Calendar,
  Home,
  Music,
  Plus,
  Settings,
  Upload,
  Users,
  Wallet,
  Bell,
  HelpCircle,
  Shield,
  Crown,
  FileWarning,
} from "lucide-react";
import {
  ResponsiveTabNavigation,
  TabItem,
} from "@/components/ResponsiveTabNavigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SimpleMembersList } from "@/components/groups/SimpleMembersList";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EditProfileForm } from "@/components/EditProfileForm";
import { MusicPublisher } from "@/components/music/MusicPublisher";
import { CreateAnnouncementForm } from "@/components/groups/CreateAnnouncementForm";
import { MemberManagement } from "@/components/groups/MemberManagement";
import { ReportsList } from "@/components/groups/ReportsList";
import { useCommunityContext } from "@/hooks/useCommunityHooks";
import { CommunityPrivileges } from "@/components/dashboard/CommunityPrivileges";
import { useNavigate } from "react-router-dom";
import { useOpenReportsCount } from "@/hooks/useOpenReportsCount";
import { usePendingJoinRequests } from "@/hooks/usePendingJoinRequests";
import { useCommunityActivity } from "@/hooks/useCommunityContent";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { SupportTab } from "@/components/dashboard/SupportTab";
import { GroupLinksContactForm } from "@/components/groups/GroupLinksContactForm";
import { FirebaseActionGuard } from "@/components/auth/FirebaseActionGuard";

interface ArtistDashboardProps {
  artistName?: string;
}

// Internal component that uses CommunityContext
function ArtistDashboardContent({
  artistName = "Artist",
}: ArtistDashboardProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();

  // Use community context instead of local state
  const {
    selectedCommunity,
    selectedCommunityId,
    communities,
    userRole,
    canUpdateCommunity,
    getCommunityName,
  } = useCommunityContext();

  // Check if user is owner or moderator for notification badges
  const isOwnerOrModerator = userRole === "owner" || userRole === "moderator";

  // Debug logging for moderation permissions
  console.log("ArtistDashboard Debug:", {
    userRole,
    selectedCommunityId,
    selectedCommunity: selectedCommunity
      ? {
          id: selectedCommunity.id,
          pubkey: selectedCommunity.pubkey,
          moderatorTags: selectedCommunity.tags?.filter(
            (tag) => tag[0] === "p" && tag[3] === "moderator"
          ),
        }
      : null,
    isOwnerOrModerator,
    userPubkey: user?.pubkey,
  });

  // Get pending reports and join requests counts for owners/moderators
  const { data: openReportsCount = 0 } = useOpenReportsCount(
    isOwnerOrModerator && selectedCommunityId ? selectedCommunityId : ""
  );
  const { pendingRequestsCount = 0 } = usePendingJoinRequests(
    isOwnerOrModerator && selectedCommunityId ? selectedCommunityId : ""
  );

  // Calculate total notification count for Moderation tab
  const moderationNotificationCount = openReportsCount + pendingRequestsCount;

  // Get recent community activity
  const { data: recentActivity = [], isLoading: isLoadingActivity } =
    useCommunityActivity(
      selectedCommunityId,
      10 // Limit to 10 most recent activities
    );

  // Define dashboard tabs with notification count
  const dashboardTabs: TabItem[] = useMemo(
    () => [
      {
        label: "Overview",
        value: "overview",
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
        label: "Moderation",
        value: "moderation",
        icon: Shield,
        badgeCount:
          moderationNotificationCount > 0
            ? moderationNotificationCount
            : undefined,
      },
      {
        label: "Wallet",
        value: "wallet",
        icon: Wallet,
      },
      {
        label: "Settings",
        value: "settings",
        icon: Settings,
      },
      {
        label: "Support",
        value: "support",
        icon: HelpCircle,
      },
    ],
    [moderationNotificationCount]
  );

  // Check URL hash for initial tab on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const validTab = dashboardTabs.find((tab) => tab.value === hash);
    if (validTab) {
      setActiveSection(hash);
    }
  }, [dashboardTabs]);

  // Handle tab change with URL hash update
  const handleTabChange = (newTab: string) => {
    setActiveSection(newTab);
    window.history.replaceState(null, "", `#${newTab}`);
  };

  // Note: Community auto-selection is now handled by CommunityContext

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* Artist Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {artistName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{artistName}</CardTitle>
                <CardDescription>Artist Dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest community interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingActivity ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                      <Bell className="h-6 w-6" />
                    </div>
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">
                      Activity will appear here when your community becomes
                      active
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start text-left"
                variant="outline"
                onClick={() => handleTabChange("music")}
              >
                <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Upload Music</span>
              </Button>
              <Button
                className="w-full justify-start text-left"
                variant="outline"
                onClick={() => handleTabChange("updates")}
                disabled={!selectedCommunity}
              >
                <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Create Announcement</span>
              </Button>
              <Button
                className="w-full justify-start text-left"
                variant="outline"
                onClick={() => handleTabChange("community")}
                disabled={!selectedCommunity}
              >
                <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Manage Community</span>
              </Button>
              {isOwnerOrModerator && moderationNotificationCount > 0 && (
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={() => handleTabChange("moderation")}
                >
                  <div className="flex items-center min-w-0">
                    <Shield className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Review Reports</span>
                  </div>
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 flex-shrink-0">
                    {moderationNotificationCount > 99
                      ? "99+"
                      : moderationNotificationCount}
                  </Badge>
                </Button>
              )}
              <Button
                className="w-full justify-start text-left"
                variant="outline"
                onClick={() => handleTabChange("settings")}
              >
                <Settings className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Settings</span>
              </Button>
              <Button
                className="w-full justify-start text-left"
                variant="outline"
                onClick={() => handleTabChange("wallet")}
              >
                <Wallet className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">View Earnings</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderCommunity = () => {
    if (!selectedCommunity) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Community Management</h2>
            <p className="text-muted-foreground">
              Manage your artist page community and settings
            </p>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">
                  No Artist Page Selected
                </h3>
                <p className="text-muted-foreground mt-2">
                  Select or create an artist page to manage community members
                  and settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!selectedCommunity) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Community Management</h2>
            <p className="text-muted-foreground">
              Select a community above to manage members and settings
            </p>
          </div>
        </div>
      );
    }

    const communityName = getCommunityName(selectedCommunity);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Community Management</h2>
          <p className="text-muted-foreground">
            Managing <strong>{communityName}</strong>
          </p>
        </div>

        {/* Community Privileges */}
        <CommunityPrivileges />

        {/* Community Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-green-600">+24 this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">892</div>
              <p className="text-xs text-green-600">+12 this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Community Members</CardTitle>
            <CardDescription>
              View and manage members of {communityName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCommunityId ? (
              <SimpleMembersList communityId={selectedCommunityId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>Unable to load community members</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Configure your profile and dashboard preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preferences</CardTitle>
              <CardDescription>
                Customize your dashboard layout and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show statistics on overview</h4>
                    <p className="text-sm text-muted-foreground">
                      Display detailed analytics on the overview page
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your community
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          {/* Single Firebase Guard for all community editing features */}
          {selectedCommunity && canUpdateCommunity && (
            <FirebaseActionGuard action="edit-group">
              <div className="space-y-4">
                {/* Community Privileges Component */}
                <CommunityPrivileges showUpdateCommunityFeatures={true} />

                {/* Group Links & Contact Form */}
                <GroupLinksContactForm
                  group={selectedCommunity}
                  communityId={selectedCommunityId!}
                />
              </div>
            </FirebaseActionGuard>
          )}

          {/* Show Community Privileges without update features for non-Firebase users */}
          {selectedCommunity && canUpdateCommunity && (
            <div className="sr-only">
              {/* This is just for the case where Firebase guard shows banner instead */}
            </div>
          )}

          {/* Show basic privileges for non-owners or when Firebase guard is blocking */}
          {selectedCommunity && !canUpdateCommunity && (
            <CommunityPrivileges showUpdateCommunityFeatures={false} />
          )}

          {/* Show message for non-owners */}
          {selectedCommunity && !canUpdateCommunity && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Only the community owner can update links and contact
                    information.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Community Settings</CardTitle>
              <CardDescription>
                Configure your artist community preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-approve members</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve new member requests
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Disabled
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Community guidelines</h4>
                    <p className="text-sm text-muted-foreground">
                      Set rules and guidelines for your community
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderWallet = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Wallet (UNDER CONSTRUCTION)</h2>
        <p className="text-muted-foreground">
          Manage your earnings and payments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">15,432 sats</div>
            <p className="text-sm text-muted-foreground">≈ $4.23 USD</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm">Withdraw</Button>
              <Button size="sm" variant="outline">
                View Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Music streams</span>
                <span className="text-sm font-medium">+124 sats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Tips received</span>
                <span className="text-sm font-medium">+500 sats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Community donations</span>
                <span className="text-sm font-medium">+89 sats</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderUpdates = () => {
    // Show message if no community selected
    if (!selectedCommunity) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Community Updates</h2>
            <p className="text-muted-foreground">
              Publish announcements and updates to your community
            </p>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  <Bell className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">
                  No Artist Page Selected
                </h3>
                <p className="text-muted-foreground mt-2">
                  Select or create an artist page to publish community updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (communities.manageable.length === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Community Updates</h2>
            <p className="text-muted-foreground">
              Publish announcements to your community
            </p>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  <Bell className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No Communities Found</h3>
                <p className="text-muted-foreground mt-2">
                  You need to be an owner or moderator of a community to publish
                  announcements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!selectedCommunity) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Community Updates</h2>
            <p className="text-muted-foreground">
              Select a community above to publish announcements
            </p>
          </div>
        </div>
      );
    }

    const communityName = getCommunityName(selectedCommunity);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Community Updates</h2>
          <p className="text-muted-foreground">
            Publishing announcements to <strong>{communityName}</strong>
          </p>
        </div>
        {/* Announcement Form */}
        <CreateAnnouncementForm
          communityId={selectedCommunityId!}
          onAnnouncementSuccess={() => {
            // Could add a refresh callback here if needed
          }}
        />
      </div>
    );
  };

  const renderModeration = () => {
    if (!selectedCommunityId) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Moderation</h2>
            <p className="text-muted-foreground">
              Select a community to manage members and reports
            </p>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No Community Selected</h3>
                <p className="text-muted-foreground mt-2">
                  Please select a community from the dropdown above to access
                  moderation tools
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Additional fallback check for moderation permissions
    const hasModeratorAccess =
      isOwnerOrModerator ||
      (selectedCommunity &&
        user &&
        (selectedCommunity.pubkey === user.pubkey || // Owner
          selectedCommunity.tags.some(
            (tag) =>
              tag[0] === "p" && tag[1] === user.pubkey && tag[3] === "moderator"
          ))); // Moderator

    if (!hasModeratorAccess) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Moderation</h2>
            <p className="text-muted-foreground">
              Community moderation and management tools
            </p>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-muted-foreground mt-2">
                  You must be a moderator or the community owner to access
                  moderation tools
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Debug: Role={userRole}, HasAccess={hasModeratorAccess}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Moderation</h2>
          <p className="text-muted-foreground">
            Manage community members and review reports
          </p>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="relative">
              <Users className="h-4 w-4 mr-2" />
              Members
              {pendingRequestsCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500 hover:bg-blue-600">
                  {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              <FileWarning className="h-4 w-4 mr-2" />
              Reports
              {openReportsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {openReportsCount > 99 ? "99+" : openReportsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <MemberManagement
              communityId={selectedCommunityId}
              isModerator={hasModeratorAccess}
            />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileWarning className="h-5 w-5 mr-2" />
                  Reports
                </CardTitle>
                <CardDescription>
                  Review and manage reported content in your community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportsList communityId={selectedCommunityId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderPlaceholder = (section: string) => {
    const sectionTitle =
      dashboardTabs.find((tab) => tab.value === section)?.label || section;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{sectionTitle}</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                {sectionTitle} Coming Soon
              </h3>
              <p className="text-muted-foreground mt-2">
                This section is under development
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "music":
        return (
          <MusicPublisher
            artistId={user?.pubkey}
            communityId={selectedCommunityId || undefined}
          />
        );
      case "updates":
        return renderUpdates();
      case "community":
        return renderCommunity();
      case "moderation":
        return renderModeration();
      case "settings":
        return renderSettings();
      case "wallet":
        return renderWallet();
      case "support":
        return <SupportTab />;
      default:
        return renderPlaceholder(activeSection);
    }
  };

  // Regular dashboard with navigation for selected community
  return (
    <div className="flex flex-col md:flex-row">
      {/* Navigation */}
      <ResponsiveTabNavigation
        tabs={dashboardTabs}
        activeTab={activeSection}
        onTabChange={handleTabChange}
        forceHorizontal={isMobile}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Dashboard Header */}
        {
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="p-6 pb-4">
              <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Artist Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Manage your content and community
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Return to Dashboard List button */}
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/dashboard")}
                    className="gap-2"
                  >
                    Return to Dashboard List
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }

        {/* Tab Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Main export component - CommunityProvider is already provided by Dashboard page
export function ArtistDashboard(props: ArtistDashboardProps) {
  return <ArtistDashboardContent {...props} />;
}
