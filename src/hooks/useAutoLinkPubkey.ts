import { useState } from "react";
import { useFirebaseLegacyAuth } from "@/lib/firebaseLegacyAuth";
import { useToast } from "@/hooks/useToast";

export interface AutoLinkResult {
  success: boolean;
  error?: Error;
}

export function useAutoLinkPubkey() {
  const { linkPubkey } = useFirebaseLegacyAuth();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);

  const autoLink = async (
    firebaseUser: { uid: string; getIdToken: () => Promise<string> },
    pubkey: string,
    signer: { pubkey: string }
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      toast({
        title: "Linking Notice",
        description: `Unable to link accounts automatically: ${errorMessage}. You can manage this in Settings later.`,
        variant: "destructive",
      });
      
      console.error("Auto-linking failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    } finally {
      setIsLinking(false);
    }
  };

  return { autoLink, isLinking };
}