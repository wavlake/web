import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { toast } from "sonner";

interface FirebaseAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  requiredFirebaseUid?: string;
  currentEmail?: string;
  showSignOutFirst?: boolean;
}

export function FirebaseAuthDialog({
  isOpen,
  onClose,
  onSuccess,
  title = "Firebase Authentication",
  description = "Sign in or create an account to link your email",
  requiredFirebaseUid,
  currentEmail,
  showSignOutFirst = false,
}: FirebaseAuthDialogProps) {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [needsSignOut, setNeedsSignOut] = useState(showSignOutFirst);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {
    isLoading: isFirebaseAuthLoading,
    error: firebaseError,
    setError: setFirebaseError,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
  } = useFirebaseLegacyAuth();

  const handleFirebaseSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { initializeFirebaseAuth } = await import("@/lib/firebaseAuth");
      const { signOut } = await import("firebase/auth");
      const { auth } = initializeFirebaseAuth();
      
      await signOut(auth);
      setNeedsSignOut(false);
      toast.success("Signed out successfully. Now sign in with the correct account.");
    } catch (error) {
      console.error("Firebase sign out error:", error);
      toast.error(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleFirebaseAuth = async () => {
    if (!formData.email || !formData.password) {
      setFirebaseError("Please fill in all fields");
      return;
    }

    if (authMode === "signup" && formData.password !== formData.confirmPassword) {
      setFirebaseError("Passwords do not match");
      return;
    }

    try {
      setFirebaseError(null);
      
      // Authenticate with Firebase
      if (authMode === "signup") {
        await handleFirebaseEmailSignup(formData.email, formData.password);
        toast.success("Account created successfully");
      } else {
        await handleFirebaseEmailLogin(formData.email, formData.password);
        toast.success("Successfully signed in");
      }

      // Clear form and close
      setFormData({ email: "", password: "", confirmPassword: "" });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Firebase authentication error:", error);
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    }
  };

  const handleClose = () => {
    setFormData({ email: "", password: "", confirmPassword: "" });
    setFirebaseError(null);
    setNeedsSignOut(showSignOutFirst);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {needsSignOut ? (
            /* Sign Out Step */
            <div className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Switch Firebase Account Required</strong>
                  <p className="mt-2">You need to sign out of your current Firebase account first, then sign in with the correct account.</p>
                  {requiredFirebaseUid && (
                    <div className="mt-2 text-sm">
                      <p><strong>Required Firebase UID:</strong> <code className="bg-orange-100 px-1 rounded">{requiredFirebaseUid.slice(0, 12)}...</code></p>
                      {currentEmail && <p><strong>Required Email:</strong> {currentEmail}</p>}
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-medium">Step 1: Sign Out</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign out of your current Firebase account first
                  </p>
                </div>
                
                <Button
                  onClick={handleFirebaseSignOut}
                  disabled={isSigningOut}
                  className="w-full"
                  variant="outline"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing Out...
                    </>
                  ) : (
                    "Sign Out of Current Account"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Sign In Step */
            <>
              {requiredFirebaseUid && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Account Specific Sign In Required</strong>
                    <p className="mt-2">You need to sign in with the specific Firebase account that owns this Nostr identity.</p>
                    <div className="mt-2 text-sm">
                      <p><strong>Required Firebase UID:</strong> <code className="bg-blue-100 px-1 rounded">{requiredFirebaseUid.slice(0, 12)}...</code></p>
                      {currentEmail && <p><strong>Linked Email:</strong> {currentEmail}</p>}
                    </div>
                    <p className="mt-2 text-sm">Please sign in with the correct account credentials.</p>
                  </AlertDescription>
                </Alert>
              )}

          <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2" disabled={!!requiredFirebaseUid}>
                <UserPlus className="h-4 w-4" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="text-center space-y-1">
                <h3 className="font-medium">Sign In to Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Use your existing Wavlake account credentials
                </p>
              </div>

              {firebaseError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{firebaseError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <div className="text-center space-y-1">
                <h3 className="font-medium">Create New Account</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new Wavlake account and link it to your Nostr identity
                </p>
              </div>

              {firebaseError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{firebaseError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isFirebaseAuthLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFirebaseAuth}
              disabled={isFirebaseAuthLoading}
              className="flex-1"
            >
              {isFirebaseAuthLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {authMode === "signup" ? "Create Account" : "Sign In"}
            </Button>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}