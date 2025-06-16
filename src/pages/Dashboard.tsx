import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginArea } from "@/components/auth/LoginArea";
import { ArtistDashboard } from "@/components/ArtistDashboard";
import { Layout } from "@/components/Layout";

export default function Dashboard() {
  const { user } = useCurrentUser();

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

  return (
    <Layout className="container mx-auto py-1 px-3 sm:px-4">
      <div className="my-6">
        <ArtistDashboard 
          artistName="Artist Name"
          artistImage=""
        />
      </div>
    </Layout>
  );
}