import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/ui/LoginButton";
import { ArtistDashboard } from "@/components/ArtistDashboard";
import {
  CommunityProvider,
  useCommunityContext,
} from "@/contexts/CommunityContext";

// Internal component that uses community context
function DashboardDetailContent() {
  const { user } = useCurrentUser();
  const { communityId } = useParams<{ communityId: string }>();
  const { selectedCommunity, getCommunityName, setSelectedCommunityId } =
    useCommunityContext();

  // Set the community ID from URL parameter when component mounts
  useEffect(() => {
    if (communityId) {
      setSelectedCommunityId(decodeURIComponent(communityId));
    }
  }, [communityId, setSelectedCommunityId]);

  if (!user) {
    return (
      <div className="space-y-6 my-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Dashboard Access</CardTitle>
            <CardDescription>
              Please log in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the artist name from the selected community, fallback to "Artist"
  const artistName = selectedCommunity
    ? getCommunityName(selectedCommunity)
    : "Artist";

  return (
    <div className="my-6">
      <ArtistDashboard artistName={artistName} />
    </div>
  );
}

// Main export with CommunityProvider wrapper
export default function DashboardDetail() {
  return (
    <CommunityProvider>
      <DashboardDetailContent />
    </CommunityProvider>
  );
}
