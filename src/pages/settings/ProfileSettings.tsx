import { EditProfileForm } from "@/components/EditProfileForm";
import Header from "@/components/ui/Header";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function ProfileSettings() {
  const { user } = useCurrentUser();

  // Redirect to home if user is not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container mx-auto py-1 px-3 sm:px-4">
      <Header />
      <div className="my-6">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        <EditProfileForm />
      </div>
    </div>
  );
}