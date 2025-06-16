import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginArea } from "@/components/auth/LoginArea";
import { ArtistDashboard } from "@/components/ArtistDashboard";
import Header from "@/components/ui/Header";

export default function Dashboard() {
  const { user } = useCurrentUser();

  if (!user) {
    return (
      <div className="container mx-auto py-1 px-3 sm:px-4">
        <Header />
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-1 px-3 sm:px-4">
      <Header />
      <div className="my-6">
        <ArtistDashboard 
          artistName="Artist Name"
          artistImage=""
        />
      </div>
    </div>
  );
}