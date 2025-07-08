import { useState } from "react";
import { useLinkFirebaseAccount } from "@/hooks/useAccountLinking";
import { toast } from "sonner";

export function useAutoLinkPubkey() {
  const { mutateAsync: linkAccount } = useLinkFirebaseAccount();
  const [isLinking, setIsLinking] = useState(false);

  const autoLink = async () => {
    setIsLinking(true);

    try {
      const result = await linkAccount();
      toast.success("Account Linked", {
        description: "Your Nostr account has been linked to your Wavlake account.",
      });
      return { success: true, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.warning("Linking Notice", {
        description: "Unable to link accounts automatically. You can manage this in Settings later.",
      });
      console.error("Auto-linking failed:", errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLinking(false);
    }
  };

  return { autoLink, isLinking };
}