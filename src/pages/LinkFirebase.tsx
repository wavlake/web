import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Shield, ExternalLink, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";

export default function LinkFirebase() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const linkingStatus = useAccountLinkingStatus();
  const [isLinking, setIsLinking] = useState(false);

  // Redirect to login if not authenticated
  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  // If already linked, show success and redirect option
  if (linkingStatus.isLinked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-800 dark:text-green-200">
                Firebase Account Linked Successfully!
              </CardTitle>
              <CardDescription className="text-base">
                Your Nostr account is now linked to Firebase. You can access all dashboard features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Return Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleFirebaseLinking = async () => {
    setIsLinking(true);
    try {
      // TODO: Implement actual Firebase linking logic
      // This is a placeholder for the Firebase authentication flow
      console.log("Starting Firebase linking process...");
      
      // For now, just redirect to settings where Firebase linking might be handled
      // In a real implementation, this would open the Firebase auth flow
      window.location.href = "/settings";
      
    } catch (error) {
      console.error("Firebase linking failed:", error);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Link Your Firebase Account</CardTitle>
            <CardDescription className="text-base">
              Group owners need to link their Nostr account to Firebase for enhanced security and advanced features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Why Firebase Linking is Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This additional security layer ensures only verified group owners can access sensitive management features.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">🔒 Security Benefits</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Enhanced account protection</li>
                  <li>• Secure group management</li>
                  <li>• Protected content uploads</li>
                  <li>• Verified owner status</li>
                </ul>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">🚀 Unlocked Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Music uploads & management</li>
                  <li>• Advanced dashboard tools</li>
                  <li>• Revenue & analytics</li>
                  <li>• Community moderation</li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-medium mb-2 text-amber-800 dark:text-amber-200">
                Note for Moderators
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                If you're a group moderator (not owner), you can access dashboard features without Firebase linking. This requirement is only for group owners.
              </p>
            </div>

            <div className="text-center space-y-4">
              <Button 
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleFirebaseLinking}
                disabled={isLinking || linkingStatus.isLoading}
                size="lg"
              >
                <ExternalLink className="h-4 w-4" />
                {isLinking ? "Connecting..." : "Link Firebase Account"}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                You'll be securely redirected to complete the linking process
              </p>

              <div className="pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/dashboard")}
                  className="text-sm"
                >
                  I'll do this later
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}