import { useState } from "react";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { useToast } from "@/hooks/useToast";
import type { AutoLinkResult, FirebaseUser, NostrSigner } from "@/types/auth";

export function useAutoLinkPubkey() {
  const { linkPubkey } = useFirebaseLegacyAuth();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);

  const autoLink = async (
    firebaseUser: FirebaseUser,
    pubkey: string,
    signer: NostrSigner
  ): Promise<AutoLinkResult> => {
    setIsLinking(true);

    try {
      await linkPubkey(pubkey, signer);
      
      toast({
        title: "Account Linked",
        description: "Your Nostr account has been successfully linked to your Wavlake account.",
      });
      
      return { success: true };
    } catch (error) {
      // Sanitize error message for user display
      const sanitizedMessage = error instanceof Error && error.message.includes('network') 
        ? "Network error" 
        : "Linking error";
      
      toast({
        title: "Linking Notice",
        description: `Unable to link accounts automatically: ${sanitizedMessage}. You can manage this in Settings later.`,
        variant: "destructive",
      });
      
      console.warn("Auto-linking failed");
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