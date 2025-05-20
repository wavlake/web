import { Card } from "@/components/ui/card";
import Header from "@/components/ui/Header";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Navigate } from "react-router-dom";

export default function Settings() {
  const { user } = useCurrentUser();

  // Redirect to home if user is not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container mx-auto p-4">
      <Header />
      <div className="my-6">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-4">
        <Link to="/settings/profile">
          <Card className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-3 text-primary" />
              <div>
                <h3 className="font-medium">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">Update your profile information</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
