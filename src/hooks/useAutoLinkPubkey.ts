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

  const autoLink = async (firebaseUser: FirebaseUser, pubkey: string) => {
    setIsLinking(true);

    try {
      await linkAccount();
      toast.success("Account Linked", {
        description: "Your Nostr account has been linked to your Wavlake account.",
      });
      return { success: true };
    } catch (error) {
      toast.warning("Linking Notice", {
        description: "Unable to link accounts automatically. You can manage this in Settings later.",
      });
      console.error("Auto-linking failed:", error);
      return { success: false, error };
    } finally {
      setIsLinking(false);
    }
  };

  return { autoLink, isLinking };
}