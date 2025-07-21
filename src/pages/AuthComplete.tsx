/**
 * Auth Complete Page
 * 
 * Dedicated page for handling Firebase passwordless authentication completion.
 * Shows a loading state while the PasswordlessCompletionHandler processes
 * the authentication in the background.
 */

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePasswordlessCompletion } from "@/hooks/auth/usePasswordlessCompletion";

export default function AuthComplete() {
  const navigate = useNavigate();
  const { getFlowContext } = usePasswordlessCompletion();

  useEffect(() => {
    // After a short delay, check if we should redirect
    // This gives PasswordlessCompletionHandler time to process
    const timer = setTimeout(() => {
      const context = getFlowContext();
      if (context) {
        // If we have flow context, go to login page where it will be resumed
        console.log('Auth completion detected flow context, redirecting to login');
        navigate('/login');
      } else {
        // If no context, go to login for manual flow selection
        console.log('Auth completion with no flow context, redirecting to login');
        navigate('/login');
      }
    }, 2000); // 2 second delay to allow processing

    return () => clearTimeout(timer);
  }, [navigate, getFlowContext]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Completing Sign In...</h1>
            <p className="text-muted-foreground">
              Please wait while we complete your authentication.
            </p>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          This should only take a moment
        </div>
      </div>
    </div>
  );
}