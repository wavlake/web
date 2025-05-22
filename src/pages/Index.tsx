import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoginDialog from "@/components/auth/LoginDialog";
import { useLoggedInAccounts } from "@/hooks/useLoggedInAccounts";
import { EditProfileForm } from "@/components/EditProfileForm";
import { generateFakeName } from "@/lib/utils";
import { useNostrLogin, NLogin } from "@nostrify/react/login";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { generateSecretKey, nip19 } from "nostr-tools";
import { toast } from "@/hooks/useToast";

const Index = () => {
  const { currentUser } = useLoggedInAccounts();
  const [loginOpen, setLoginOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { addLogin } = useNostrLogin();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const [newUser, setNewUser] = useState(false);

  // Redirect to /groups after user is logged in
  useEffect(() => {
    if (currentUser && !newUser) {
      navigate("/groups", { replace: true });
    }
  }, [newUser, currentUser, navigate]);

  // Handle account creation inline
  const handleCreateAccount = async () => {
    setNewUser(true);
    setCreating(true);
    try {
      // Generate new secret key
      const sk = generateSecretKey();
      const nsec = nip19.nsecEncode(sk);
      // Create login and sign in
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
      // Generate fake name and publish kind:0 metadata
      const fakeName = generateFakeName();
      // Wait for login to be available (since addLogin is sync but state update is async)
      setTimeout(async () => {
        try {
          await publishEvent({
            kind: 0,
            content: JSON.stringify({ name: fakeName, display_name: fakeName }),
          });
        } catch {
          // fallthrough
        }
      }, 100);
      toast({ title: "Account created", description: "You are now logged in." });
      setNewUser(true); // Mark as new user
    } catch (e) {
      toast({ title: "Error", description: "Failed to create account. Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Handler for login dialog
  const handleLogin = () => {
    setLoginOpen(false);
  };

  // Onboarding step 1: Not logged in
  if (!currentUser) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-start pt-[20vh] bg-background dark:bg-dark-background p-8">
          <div className="w-full max-w-md mx-auto px-8 bg-card dark:bg-dark-card rounded-2xl shadow-lg text-center">
            <h1 className="text-4xl font-extralight mb-4">
              <div className="text-4xl">welcome to</div>
              <div className="flex flex-row gap-0 items-baseline justify-center">
                <span className="text-red-500 font-extrabold text-4xl">+</span>
                <span className="text-black dark:text-white font-extrabold text-4xl">chorus</span>
              </div>
            </h1>
          </div>
          <div className="text-lg text-muted-foreground mb-8 font-extralight">
            public/private groups are money
          </div>
          <Button size="lg" className="w-full mb-4 text-lg font-medium dark:bg-blue-600 bg-blue-500 border-2 dark:border-blue-500 border-blue-400 text-white" onClick={handleCreateAccount} disabled={creating}>
            {creating ? "Creating..." : "Start"}
          </Button>
          <div className="text-sm text-muted-foreground flex flex-col gap-0 mt-6">
            Have a Nostr/+chorus account?{' '}
            <Button variant="link" size="lg" className="text-primary font-medium hover:underline" onClick={() => setLoginOpen(true)}>
              Sign in
            </Button>
          </div>
        </div>
        <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />
      </>
    );
  }

  // Onboarding step 2: New user (just created account) or user without metadata
  if (currentUser && newUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-dark-background">
        <div className="w-full max-w-lg mx-auto p-8 bg-card dark:bg-dark-card rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Set up your profile</h2>
          <p className="text-gray-600 mb-6 text-center">
            Add your display name and picture. You can always update them later.
          </p>
          <EditProfileForm showSkipLink={true} />
        </div>
      </div>
    );
  }

  // Fallback (should redirect to /groups in most cases)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div>Redirecting to groups...</div>
    </div>
  );
};

export default Index;
