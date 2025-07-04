import { EditProfileForm } from "@/components/EditProfileForm";
import { Navigate, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ProfileSettings() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  // Redirect to home if user is not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="my-6 space-y-6">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <EditProfileForm />
      </div>
    </div>
  );
}