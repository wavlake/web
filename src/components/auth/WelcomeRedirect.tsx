import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserGroups } from "@/hooks/useUserGroups";

interface WelcomeRedirectProps {
  children: React.ReactNode;
}

export function WelcomeRedirect({ children }: WelcomeRedirectProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const userGroups = useUserGroups();
  const { data: groupsData, isLoading } = userGroups;
  const allGroups = groupsData?.allGroups;
  
  // Track if user has navigated away from welcome page intentionally
  const hasNavigatedFromWelcome = useRef(false);

  // Track navigation away from welcome page
  useEffect(() => {
    if (location.pathname !== "/welcome" && hasNavigatedFromWelcome.current === false) {
      hasNavigatedFromWelcome.current = true;
    }
  }, [location.pathname]);

  useEffect(() => {
    // Only proceed if user is logged in and we have group data
    if (!user || isLoading || !allGroups) {
      return;
    }

    // Check if user has any group associations (member/owner/moderator)
    const hasGroupAssociations = allGroups.length > 0;

    // Handle users WITHOUT group associations
    if (!hasGroupAssociations) {
      // Don't redirect if already on welcome/splash page
      if (location.pathname === "/welcome") {
        return;
      }
      
      // Don't redirect if user has intentionally navigated away from welcome
      if (hasNavigatedFromWelcome.current) {
        return;
      }
      
      // Redirect to welcome/splash page for users with no associations
      navigate("/welcome", { replace: true });
      return;
    }

    // Handle users WITH group associations
    // Don't redirect away from welcome page if they're viewing it intentionally
    if (location.pathname === "/welcome") {
      return;
    }

    // No auto-redirects for dashboard - let users navigate manually

    // For users with associations landing on root or other pages,
    // let them proceed normally (no redirect needed)
  }, [user, allGroups, isLoading, location.pathname, navigate]);

  return <>{children}</>;
}
