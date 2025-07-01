import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCommunityContext } from "@/contexts/CommunityContext";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";

interface FirebaseOwnerGuardProps {
  children: React.ReactNode;
}

export function FirebaseOwnerGuard({ children }: FirebaseOwnerGuardProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { userRole } = useCommunityContext();
  const linkingStatus = useAccountLinkingStatus();

  // Check if user is an owner and needs Firebase linking
  const isOwner = userRole === "owner";
  const needsFirebaseLinking = isOwner && linkingStatus.isLinked === false;
  const isLoading = linkingStatus.isLoading;

  useEffect(() => {
    // Redirect owners to Firebase linking page if they need to link their account
    if (!isLoading && needsFirebaseLinking) {
      navigate("/link-firebase", { replace: true });
    }
  }, [isLoading, needsFirebaseLinking, navigate]);

  // If user is not logged in, not an owner, loading, or needs Firebase linking, show children or handle redirect
  if (!user || !isOwner || isLoading || needsFirebaseLinking) {
    return <>{children}</>;
  }

  // User is an owner with linked Firebase account, show dashboard content
  return <>{children}</>;
}