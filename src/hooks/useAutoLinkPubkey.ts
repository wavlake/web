import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";
import { logAuthSuccess, logAuthError } from "@/lib/authLogger";
import { isValidPubkey } from "@/lib/pubkeyUtils";

interface FirebaseUser {
  uid: string;
  email: string | null;
  getIdToken: () => Promise<string>;
}

interface NostrSigner {
  // Define signer interface if needed
  [key: string]: unknown;
}

interface AutoLinkResult {
  success: boolean;
  message?: string;
  error?: Error;
}

/**
 * Hook for automatically linking Firebase accounts with Nostr pubkeys
 * Handles the secure linking process with proper error handling and logging
 */
export function useAutoLinkPubkey() {
  const { linkPubkey } = useFirebaseLegacyAuth();
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  const [isLinking, setIsLinking] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Automatically links a Firebase user account with a Nostr pubkey
   * @param firebaseUser - The authenticated Firebase user (required)
   * @param pubkey - The Nostr pubkey to link (optional, will use current user's pubkey if not provided)
   * @param signer - Optional Nostr signer for direct linking
   * @returns Promise resolving to AutoLinkResult indicating success/failure
   */
  const autoLink = async (
    firebaseUser: FirebaseUser,
    pubkey?: string,
    signer?: NostrSigner
  ): Promise<AutoLinkResult> => {
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
      let result;
      
      // Use signer-based linking if signer is provided, otherwise use account linking hook
      if (signer && pubkey) {
        await linkPubkey(pubkey, signer);
        result = { message: "Account linked successfully using signer" };
      } else {
        // Use the linkAccount function that uses current user's pubkey from useCurrentUser
        result = await linkAccount();
      }
      
      // Log successful linking
      logAuthSuccess('account-linking', firebaseUser, pubkey);
      
      // Invalidate linked pubkeys cache to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ["linked-pubkeys", firebaseUser.uid] 
      });
      
      // Emit event for other components to react to auto-linking
      window.dispatchEvent(new CustomEvent('account-linked', { 
        detail: { 
          pubkey: pubkey,
          firebaseUid: firebaseUser.uid,
          success: true,
          isAutoLink: true
        } 
      }));
      
      // Use both toast systems for better compatibility  
      toast.success("Account Linked", {
        description: "Your Nostr account has been linked to your Wavlake account.",
      });
      
      return { success: true, message: result.message };
    } catch (error) {
      // Log the error with appropriate context
      logAuthError('account-linking', error, firebaseUser, pubkey);
      
      // Show user-friendly notice (linking failure is not critical)
      const sanitizedMessage = error instanceof Error && error.message.includes('network') 
        ? "Network error" 
        : "Linking error";
      
      toast.warning("Linking Notice", {
        description: "Unable to link accounts automatically. You can manage this in Settings later.",
      });
      
      // Log error without sensitive details for debugging
      console.warn("Auto-linking failed");
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error("Auto-linking failed")
      };
    } finally {
      setIsLinking(false);
    }
  };

  return { autoLink, isLinking };
}