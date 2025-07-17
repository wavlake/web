/**
 * Checking Links Step
 * 
 * Loading state while checking for linked Nostr accounts.
 * This step automatically transitions based on the results.
 */

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Link, AlertCircle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface CheckingLinksStepProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CheckingLinksStep({ 
  isLoading, 
  error, 
  onRetry, 
  onCancel 
}: CheckingLinksStepProps) {

  // ============================================================================
  // Auto-retry Effect
  // ============================================================================

  useEffect(() => {
    // If there's an error and we have a retry function, we could implement
    // automatic retry logic here (with exponential backoff, etc.)
    // For now, we'll leave it to manual retry
  }, [error, onRetry]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Link className="h-5 w-5" />
            Checking Linked Accounts
          </CardTitle>
          <CardDescription>
            Looking for Nostr accounts linked to your Wavlake account...
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Checking your account...
            </span>
          </div>
          
          {/* Progress indicator */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Authenticating...</span>
              <span>Searching...</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: "60%" }}
              />
            </div>
          </div>
          
          {/* Info text */}
          <div className="text-center text-sm text-muted-foreground max-w-sm">
            <p>
              We're checking if you have any Nostr accounts linked to your Wavlake account. 
              This will determine your next steps.
            </p>
          </div>
          
          {/* Cancel button */}
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="mt-4"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Connection Error
          </CardTitle>
          <CardDescription>
            We couldn't check your linked accounts
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>
              This might be a temporary network issue. Please try again.
            </p>
          </div>
          
          <div className="flex space-x-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="flex-1"
              >
                Try Again
              </Button>
            )}
            
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Default State (shouldn't happen)
  // ============================================================================

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Checking Linked Accounts</CardTitle>
        <CardDescription>
          Please wait while we check your account...
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          If this screen persists, please refresh the page.
        </p>
        
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="mt-4"
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}