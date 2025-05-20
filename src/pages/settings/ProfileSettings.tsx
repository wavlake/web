import { EditProfileForm } from "@/components/EditProfileForm";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/ui/Header";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Navigate } from "react-router-dom";

export default function ProfileSettings() {
  const { user } = useCurrentUser();

  // Redirect to home if user is not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container mx-auto p-4">
      <Header />
      <div className="my-6">
        <h1 className="text-3xl font-bold">Edit Your Profile</h1>
      </div>
      <EditProfileForm />
    </div>
  );
}
