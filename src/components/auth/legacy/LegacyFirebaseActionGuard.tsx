import { ReactNode, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";
import { CommunityContext } from "@/contexts/CommunityContext";

interface FirebaseActionGuardProps {
  children: ReactNode;
  action: "create-group" | "edit-group" | "upload-music" | "edit-music";
  className?: string;
}

/**
 * Granular Firebase guard that only blocks specific actions requiring Firebase linking.
 * Shows a banner with navigation to account linking instead of redirecting away from the page.
 */
export function FirebaseActionGuard({ 
  children, 
  action, 
  className = "" 
}: FirebaseActionGuardProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { isLinked, isLoading } = useAccountLinkingStatus();
  
  // Use context directly to check if it's available
  const communityContext = useContext(CommunityContext);
  
  // Determine if Firebase is required based on action type and context
  let requiresFirebase = false;
  
  if (action === "create-group") {
    // Always require Firebase for creating groups (regardless of community context)
    requiresFirebase = !!user;
  } else if (action === "upload-music" || action === "edit-music") {
    // Music actions require Firebase if user is logged in
    requiresFirebase = !!user;
  } else if (action === "edit-group" && communityContext) {
    // Edit group actions only require Firebase if user is an owner in the community context
    requiresFirebase = communityContext.userRole === "owner";
  }

  // Don't guard if user is not logged in or Firebase is not required
  if (!user || !requiresFirebase) {
    return <>{children}</>;
  }

  // Show loading state while checking linking status
  if (isLoading) {
    return <>{children}</>;
  }

  // If Firebase account is already linked, show the protected content
  if (isLinked) {
    return <>{children}</>;
  }

  // User is an owner without Firebase linking - show restriction banner
  const actionLabels = {
    "create-group": "create new artist pages",
    "edit-group": "edit artist page settings",
    "upload-music": "upload music tracks",
    "edit-music": "edit existing tracks"
  };

  const actionLabel = actionLabels[action];

  return (
    <div className={className}>
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-3">
            <div>
              <p className="font-medium">Firebase Account Required</p>
              <p className="text-sm mt-1">
                You need to link your Firebase account to {actionLabel}. This ensures secure access to content management features.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/account-linking")}
                className="bg-amber-600 text-white hover:bg-amber-700"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Link Firebase Account
              </Button>
              
              <span className="text-xs text-amber-700">
                You can continue using other dashboard features without linking
              </span>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}