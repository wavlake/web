import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { toast } from "sonner";

interface FirebaseAuthFormProps {
  onSuccess: (user: FirebaseUser) => void;
  onBack: () => void;
  title?: string;
  description?: string;
}

export function FirebaseAuthForm({
  onSuccess,
  onBack,
  title = "Sign in to Wavlake",
  description = "Use your existing email and password",
}: FirebaseAuthFormProps) {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const {
    isLoading: isFirebaseAuthLoading,
    error: firebaseError,
    setError: setFirebaseError,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
  } = useFirebaseLegacyAuth();

  const handleFirebaseAuth = async () => {
    if (!formData.email || !formData.password) {
      setFirebaseError("Please fill in all fields");
      return;
    }

    if (
      authMode === "signup" &&
      formData.password !== formData.confirmPassword
    ) {
      setFirebaseError("Passwords do not match");
      return;
    }

    try {
      let user: FirebaseUser;

      // Use hook methods for authentication
      if (authMode === "signup") {
        user = await handleFirebaseEmailSignup(formData.email, formData.password);
        toast.success("Account created successfully");
      } else {
        user = await handleFirebaseEmailLogin(formData.email, formData.password);
        toast.success("Successfully signed in");
      }

      // Clear form and trigger success with user
      setFormData({ email: "", password: "", confirmPassword: "" });
      onSuccess(user);
    } catch (error) {
      console.error("Firebase authentication error:", error);
      toast.error(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
          </div>

          <Tabs
            value={authMode}
            onValueChange={(value) =>
              setAuthMode(value as "login" | "signup")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="login"
                className="flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex items-center gap-2"
              >
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
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <div className="text-center space-y-1">
                <h3 className="font-medium">Create New Account</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new Wavlake account and link it to your Nostr
                  identity
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
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-confirm-password">
                    Confirm Password
                  </Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    disabled={isFirebaseAuthLoading}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleFirebaseAuth}
            disabled={isFirebaseAuthLoading}
            className="w-full"
            size="lg"
          >
            {isFirebaseAuthLoading && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {authMode === "signup" ? "Create Account" : "Sign In"}
          </Button>
        </div>
      </div>
    </div>
  );
}