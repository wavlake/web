import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  UserPlus,
  LogIn,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccountLinkingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type LinkingStep = "choose" | "signup" | "login" | "linking" | "complete";

export function AccountLinkingFlow({
  isOpen,
  onClose,
  onSuccess,
}: AccountLinkingFlowProps) {
  const { user } = useCurrentUser();
  const [step, setStep] = useState<LinkingStep>("choose");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");

  const {
    isLoading,
    error,
    setError,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
    linkPubkey,
  } = useFirebaseLegacyAuth();

  const handleChooseAction = (action: "signup" | "login") => {
    setAuthMode(action);
    setStep(action);
    setError(null);
  };

  const handleFirebaseAuth = async () => {
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (
      authMode === "signup" &&
      formData.password !== formData.confirmPassword
    ) {
      setError("Passwords do not match");
      return;
    }

    try {
      setStep("linking");

      // Step 1: Authenticate with Firebase
      if (authMode === "signup") {
        await handleFirebaseEmailSignup(formData.email, formData.password);
      } else {
        await handleFirebaseEmailLogin(formData.email, formData.password);
      }

      // Step 2: Link Nostr pubkey to Firebase account
      if (user?.pubkey && user?.signer) {
        await linkPubkey(user.pubkey, user.signer);
      }

      setStep("complete");
    } catch (err) {
      console.error("Account linking failed:", err);
      setError(err instanceof Error ? err.message : "Account linking failed");
      setStep(authMode); // Go back to the form
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
    // Reload the page to refresh the account linking status
    window.location.reload();
  };

  const renderChooseStep = () => (
    <div className="space-y-3">
      <div className="text-center space-y-2">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-semibold">Account Linking Required</h3>
        <p className="text-xs text-muted-foreground px-2">
          To upload music, you need to link your Nostr identity to a Wavlake
          account. This enables payment processing and content management.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleChooseAction("signup")}
        >
          <CardHeader className="text-center pb-2">
            <UserPlus className="w-6 h-6 text-blue-500 mx-auto" />
            <CardTitle className="text-base">Create New Account</CardTitle>
            <CardDescription className="text-xs">
              Sign up for a new Wavlake account and link it to your Nostr
              identity
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full" variant="outline" size="sm">
              Sign Up & Link
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleChooseAction("login")}
        >
          <CardHeader className="text-center pb-2">
            <LogIn className="w-6 h-6 text-green-500 mx-auto" />
            <CardTitle className="text-base">Use Existing Account</CardTitle>
            <CardDescription className="text-xs">
              Sign in to your existing Wavlake account and link it to your Nostr
              identity
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full" variant="outline" size="sm">
              Sign In & Link
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-2">
        <Button variant="ghost" onClick={onClose} size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderAuthStep = () => (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">
          {authMode === "signup"
            ? "Create Wavlake Account"
            : "Sign In to Wavlake"}
        </h3>
        <p className="text-xs text-muted-foreground px-2">
          {authMode === "signup"
            ? "Create a new Wavlake account to link with your Nostr identity"
            : "Sign in to your existing Wavlake account"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            disabled={isLoading}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-sm">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={isLoading}
            className="h-9"
          />
        </div>

        {authMode === "signup" && (
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              disabled={isLoading}
              className="h-9"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => setStep("choose")}
          disabled={isLoading}
          size="sm"
        >
          Back
        </Button>
        <Button
          onClick={handleFirebaseAuth}
          disabled={isLoading}
          className="flex-1"
          size="sm"
        >
          {isLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {authMode === "signup" ? "Create & Link" : "Sign In & Link"}
        </Button>
      </div>
    </div>
  );

  const renderLinkingStep = () => (
    <div className="space-y-3 text-center py-4">
      <Loader2 className="w-10 h-10 text-blue-500 mx-auto animate-spin" />
      <h3 className="text-base font-semibold">Linking Accounts</h3>
      <p className="text-xs text-muted-foreground px-2">
        Connecting your Wavlake account to your Nostr identity...
      </p>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>Wavlake authentication completed</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Linking Nostr identity...</span>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-3 text-center">
      <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
      <h3 className="text-base font-semibold">Account Successfully Linked!</h3>
      <p className="text-xs text-muted-foreground px-2">
        Your Nostr identity is now linked to your Wavlake account. You can now
        upload music and manage your content.
      </p>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <h4 className="font-medium text-green-800 mb-2 text-sm">
          What you can now do:
        </h4>
        <ul className="text-xs text-green-700 space-y-1 text-left">
          <li>• Upload and publish music tracks</li>
          <li>• Create and manage albums</li>
          <li>• Receive payments and royalties</li>
          <li>• Access advanced creator features</li>
        </ul>
      </div>

      <Button onClick={handleComplete} className="w-full" size="sm">
        Continue to Upload Music
      </Button>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case "choose":
        return renderChooseStep();
      case "signup":
      case "login":
        return renderAuthStep();
      case "linking":
        return renderLinkingStep();
      case "complete":
        return renderCompleteStep();
      default:
        return renderChooseStep();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto sm:top-[40%] top-[5vh] sm:translate-y-[-50%] translate-y-0">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="text-lg">Link Your Account</DialogTitle>
          <DialogDescription className="text-sm">
            Connect your Nostr identity with a Wavlake account to enable music
            uploads
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          {getStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
