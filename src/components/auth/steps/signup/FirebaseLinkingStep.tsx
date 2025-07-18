/**
 * FirebaseLinkingStep Component
 *
 * Automatically handles the linking of Firebase account to Nostr account during signup.
 * Shows loading state while linking happens in the background.
 */

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FirebaseLinkingStepProps {
  onComplete: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  firebaseUser: {
    email?: string | null;
    uid: string;
  } | null;
}

export function FirebaseLinkingStep({
  onComplete,
}: FirebaseLinkingStepProps) {
  // Auto-trigger linking when component mounts
  useEffect(() => {
    let hasRun = false;
    
    const performLinking = async () => {
      if (hasRun) return;
      hasRun = true;
      
      try {
        await onComplete();
      } catch (err) {
        console.error("Failed to link Firebase account:", err);
        // Show user-friendly error toast but continue flow
        toast.error(
          "Account backup linking failed, but you can continue. You may need to re-link your account later in settings."
        );
      }
    };

    // Small delay to ensure smooth transition
    const timer = setTimeout(performLinking, 500);
    return () => clearTimeout(timer);
  }, []); // Empty dependency array to run only once

  return (
    <div className="flex justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}
