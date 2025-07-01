import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Users, Mic, Construction } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CreateArtist() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // Redirect to login if not authenticated
  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Construction className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-2xl">Create Artist Page</CardTitle>
            <CardDescription className="text-base">
              Artist creation walkthrough coming soon!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                  🚧 Under Development
                </h3>
                <p className="text-orange-700 dark:text-orange-300">
                  We're building a comprehensive artist onboarding experience that will guide you through:
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Mic className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Artist Profile Setup</h4>
                  <p className="text-sm text-muted-foreground">
                    Name, bio, images, and contact information
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Community Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Group settings, guidelines, and moderation options
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Music className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Music & Content Setup</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload preferences, monetization, and distribution settings
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                For now, you can create a group using the existing creation flow:
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/create-group")}>
                  Use Existing Group Creation
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                The dedicated artist creation wizard will be available soon!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}