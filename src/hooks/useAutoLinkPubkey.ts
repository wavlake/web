import { useState } from "react";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";

interface FirebaseUser {
  uid: string;
  email: string | null;
}

export function useAutoLinkPubkey() {
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  const [isLinking, setIsLinking] = useState(false);

  const autoLink = async (firebaseUser: FirebaseUser, pubkey?: string) => {
    if (!firebaseUser) {
      throw new Error("Firebase user is required for linking");
    }

    setIsLinking(true);

    try {
      const result = await linkAccount();
      toast.success("Account Linked", {
        description: "Your Nostr account has been linked to your Wavlake account.",
      });
      
      // Log successful linking with context
      console.info("Auto-linking successful", {
        firebaseUid: firebaseUser.uid,
        firebaseEmail: firebaseUser.email,
        pubkey: pubkey ? `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}` : 'current-user-pubkey'
      });
      
      return { success: true, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log detailed error context
      console.error("Auto-linking failed", {
        firebaseUid: firebaseUser.uid,
        firebaseEmail: firebaseUser.email,
        pubkey: pubkey ? `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}` : 'current-user-pubkey',
        error: errorMessage,
        operation: 'account-linking'
      });
      
      toast.warning("Linking Notice", {
        description: "Unable to link accounts automatically. You can manage this in Settings later.",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLinking(false);
    }
  };

  return { autoLink, isLinking };
}