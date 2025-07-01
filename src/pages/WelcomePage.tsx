import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, Headphones, Mic } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserGroups } from "@/hooks/useUserGroups";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const userGroups = useUserGroups();
  const { data: groupsData, isLoading } = userGroups;
  const allGroups = groupsData?.allGroups;

  // Redirect if user has group associations
  useEffect(() => {
    if (!isLoading && allGroups && allGroups.length > 0) {
      navigate("/", { replace: true });
    }
  }, [allGroups, isLoading, navigate]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleArtistPath = () => {
    navigate("/dashboard");
  };

  const handleListenerPath = () => {
    navigate("/");
  };

  if (!user || isLoading) {
    return null; // Loading or redirect in progress
  }

  // Only show if user has no group associations
  if (allGroups && allGroups.length > 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to Wavlake!</h1>
          <p className="text-xl text-muted-foreground mb-2">
            You're all set up with Nostr authentication
          </p>
          <p className="text-muted-foreground">
            What would you like to do on Wavlake?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Artist Path */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm an Artist</CardTitle>
              <CardDescription className="text-base">
                Share your music and connect with fans through your own artist community
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Create your artist page
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Build your community
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Upload and share music
                </li>
              </ul>
              <Button 
                onClick={handleArtistPath} 
                className="w-full"
                size="lg"
              >
                Start as Artist
              </Button>
            </CardContent>
          </Card>

          {/* Listener Path */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm a Listener</CardTitle>
              <CardDescription className="text-base">
                Discover amazing music and join artist communities
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Discover new music
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Join artist communities
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Support your favorite artists
                </li>
              </ul>
              <Button 
                onClick={handleListenerPath} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                Start Exploring
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            You can always switch between roles later. This just helps us get you started!
          </p>
        </div>
      </div>
    </div>
  );
}