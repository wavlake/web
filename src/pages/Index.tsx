import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SignupDialog from "@/components/auth/SignupDialog";
import LoginDialog from "@/components/auth/LoginDialog";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";
import { EditProfileForm } from "@/components/EditProfileForm";

const Index = () => {
  const { currentUser } = useLoggedInAccounts();
  const [signupOpen, setSignupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const navigate = useNavigate();

  // Check if the user has filled out their profile (basic check: has name or about or picture)
  useEffect(() => {
    if (currentUser && (currentUser.metadata?.name || currentUser.metadata?.about || currentUser.metadata?.picture)) {
      setProfileComplete(true);
    } else {
      setProfileComplete(false);
    }
  }, [currentUser]);

  // Redirect to /groups after profile is complete
  useEffect(() => {
    if (profileComplete && currentUser) {
      navigate("/groups", { replace: true });
    }
  }, [profileComplete, currentUser, navigate]);

  // Onboarding step 1: Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
        <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
          <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Welcome to Chorus
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Create your account to get started.
          </p>
          <Button size="lg" className="w-full mb-4" onClick={() => setSignupOpen(true)}>
            Create Account
          </Button>
          <div className="text-sm text-gray-600">
            Already have a Nostr account?{' '}
            <button type="button" className="text-primary font-medium hover:underline" onClick={() => setLoginOpen(true)}>
              Sign in
            </button>
          </div>
        </div>
        <SignupDialog isOpen={signupOpen} onClose={() => setSignupOpen(false)} />
        <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={() => setLoginOpen(false)} />
      </div>
    );
  }

  // Onboarding step 2: Logged in, but profile not complete
  if (currentUser && !profileComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="w-full max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Set up your profile</h2>
          <p className="text-gray-600 mb-6 text-center">
            Add your display name, bio, and profile picture. You can always update this later.
          </p>
          <EditProfileForm />
        </div>
      </div>
    );
  }

  // Fallback (should not be seen)
  return null;
};

export default Index;
