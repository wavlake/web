import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginArea } from "@/components/auth/LoginArea";
import { ArtistDashboard } from "@/components/ArtistDashboard";
import { Layout } from "@/components/Layout";
import { CommunityProvider, useCommunityContext } from "@/contexts/CommunityContext";

// Internal component that uses community context
function DashboardContent() {
  const { user } = useCurrentUser();
  const { selectedCommunity, getCommunityName } = useCommunityContext();

  if (!user) {
    return (
      <Layout className="container mx-auto py-1 px-3 sm:px-4">
        <div className="space-y-6 my-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Dashboard Access</CardTitle>
              <CardDescription>
                Please log in to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginArea />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Get the artist name from the selected community, fallback to "Artist"
  const artistName = selectedCommunity ? getCommunityName(selectedCommunity) : "Artist";

  return (
    <Layout className="container mx-auto py-1 px-3 sm:px-4">
      <div className="my-6">
        <ArtistDashboard 
          artistName={artistName}
          artistImage=""
        />
      </div>
    </Layout>
  );
}

// Main export with CommunityProvider wrapper
export default function Dashboard() {
  return (
    <CommunityProvider>
      <DashboardContent />
    </CommunityProvider>
  );
}