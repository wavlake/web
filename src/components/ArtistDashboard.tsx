import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Calendar,
  DollarSign,
  Home,
  Music,
  Plus,
  Settings,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  Bell,
  HelpCircle,
  Shield,
} from "lucide-react";
import { ResponsiveTabNavigation, TabItem } from "@/components/ResponsiveTabNavigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SimpleMembersList } from "@/components/groups/SimpleMembersList";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EditProfileForm } from "@/components/EditProfileForm";

const dashboardTabs: TabItem[] = [
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
];

interface ArtistDashboardProps {
  artistName?: string;
  artistImage?: string;
  communityId?: string;
}

export function ArtistDashboard({
  artistName = "Artist",
  artistImage,
  communityId = "placeholder-community",
}: ArtistDashboardProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();

  // Check URL hash for initial tab on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const validTab = dashboardTabs.find((tab) => tab.value === hash);
    if (validTab) {
      setActiveSection(hash);
    }
  }, []);

  // Handle tab change with URL hash update
  const handleTabChange = (newTab: string) => {
    setActiveSection(newTab);
    window.history.replaceState(null, "", `#${newTab}`);
  };

  // Stats placeholder data
  const stats = [
    {
      title: "Total Streams",
      value: "12,345",
      change: "+12%",
      icon: TrendingUp,
    },
    {
      title: "Total Revenue",
      value: "2,847 sats",
      change: "+8%",
      icon: DollarSign,
    },
    {
      title: "Followers",
      value: "1,234",
      change: "+24%",
      icon: Users,
    },
    {
      title: "Wallet Balance",
      value: "15,432 sats",
      change: "0%",
      icon: Wallet,
    },
  ];

  const renderOverview = () => (
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

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    stat.change.includes("+")
                      ? "text-green-600"
                      : "text-gray-600"
                  }
                >
                  {stat.change}
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center space-x-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U{item}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        User {item} commented on your track
                      </p>
                      <p className="text-xs text-muted-foreground">
                        2 hours ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Music
            </Button>
            <Button className="w-full" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
            <Button className="w-full" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Event
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Community Management</h2>
        <p className="text-muted-foreground">
          Manage your artist community members and settings
        </p>
      </div>

      {/* Community Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-green-600">+24 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <p className="text-xs text-green-600">+12 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
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
            View and manage your community members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {communityId !== "placeholder-community" ? (
            <SimpleMembersList communityId={communityId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>Set up your community to view members</p>
              <Button className="mt-4" variant="outline">
                Configure Community
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

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
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your community
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
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
                  <Button variant="outline" size="sm">Disabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Community guidelines</h4>
                    <p className="text-sm text-muted-foreground">
                      Set rules and guidelines for your community
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
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
        <h2 className="text-2xl font-bold">Wallet</h2>
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
              <Button size="sm" variant="outline">View Transactions</Button>
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

  const renderPlaceholder = (section: string) => {
    const sectionTitle = dashboardTabs.find(tab => tab.value === section)?.label || section;
    
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
      case "community":
        return renderCommunity();
      case "settings":
        return renderSettings();
      case "wallet":
        return renderWallet();
      default:
        return renderPlaceholder(activeSection);
    }
  };

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
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}