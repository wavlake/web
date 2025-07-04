import { useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ReactNode } from "react";

interface GlobalLayoutProps {
  children: ReactNode;
}

// Routes that should not have the global layout applied
const EXCLUDED_ROUTES = [
  "/", // Landing page - custom layout for login/onboarding
  "/welcome", // Welcome page - custom onboarding flow
];

// Routes that need special layout treatment
const FULL_WIDTH_ROUTES = [
  "/group/", // Group detail pages may need full width
];

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const location = useLocation();
  
  // Check if current route should be excluded from layout
  const isExcluded = EXCLUDED_ROUTES.some(route => 
    location.pathname === route
  );
  
  // If route is excluded, render children without layout
  if (isExcluded) {
    return <>{children}</>;
  }
  
  // Check if route needs full width
  const needsFullWidth = FULL_WIDTH_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );
  
  // Apply appropriate layout based on route
  if (needsFullWidth) {
    return (
      <Layout className="flex flex-col w-full">
        {children}
      </Layout>
    );
  }
  
  // Default layout with consistent container classes
  return (
    <Layout className="container mx-auto py-1 px-3 sm:px-4">
      {children}
    </Layout>
  );
}