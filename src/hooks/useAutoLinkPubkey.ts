import { useState } from "react";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";
import { logAuthSuccess, logAuthError } from "@/lib/authLogger";
import { isValidPubkey } from "@/lib/pubkeyUtils";

interface FirebaseUser {
  uid: string;
  email: string | null;
}

interface AutoLinkResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Hook for automatically linking Firebase accounts with Nostr pubkeys
 * Handles the secure linking process with proper error handling and logging
 */
export function useAutoLinkPubkey() {
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  const [isLinking, setIsLinking] = useState(false);

  /**
   * Automatically links a Firebase user account with a Nostr pubkey
   * @param firebaseUser - The authenticated Firebase user (required)
   * @param pubkey - The Nostr pubkey to link (optional, will use current user's pubkey if not provided)
   * @returns Promise resolving to AutoLinkResult indicating success/failure
   */
  const autoLink = async (firebaseUser: FirebaseUser, pubkey?: string): Promise<AutoLinkResult> => {
    if (!firebaseUser) {
      throw new Error("Firebase user is required for linking");
    }

    // Validate pubkey if provided
    if (pubkey && !isValidPubkey(pubkey)) {
      const error = new Error("Invalid pubkey format provided for linking");
      logAuthError('account-linking-validation', error, firebaseUser, pubkey);
      throw error;
    }

    setIsLinking(true);

    try {
      // Perform the actual account linking
      // Note: The linkAccount function uses the current user's pubkey from useCurrentUser
      // The pubkey parameter is used for logging and validation purposes
      const result = await linkAccount();
      
      // Log successful linking
      logAuthSuccess('account-linking', firebaseUser, pubkey);
      
      toast.success("Account Linked", {
        description: "Your Nostr account has been linked to your Wavlake account.",
      });
      
      return { success: true, message: result.message };
    } catch (error) {
      // Log the error with appropriate context
      logAuthError('account-linking', error, firebaseUser, pubkey);
      
      // Show user-friendly notice (linking failure is not critical)
      toast.warning("Linking Notice", {
        description: "Unable to link accounts automatically. You can manage this in Settings later.",
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    } finally {
      setIsLinking(false);
    }
  };

  return { autoLink, isLinking };
}