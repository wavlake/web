import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/ui/LoginButton";
import { DashboardList } from "@/components/DashboardList";
import { CommunityProvider } from "@/contexts/CommunityContext";

// Internal component that uses community context
function DashboardContent() {
  const { user } = useCurrentUser();

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

  return <DashboardList />;
}

// Main export with CommunityProvider wrapper
export default function Dashboard() {
  return (
    <CommunityProvider>
      <DashboardContent />
    </CommunityProvider>
  );
}
