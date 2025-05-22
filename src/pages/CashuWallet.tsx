import { useEffect, useState } from "react";
import { LoginArea } from "@/components/auth/LoginArea";
import { CashuHistoryCard } from "@/components/cashu/CashuHistoryCard";
import { CashuTokenCard } from "@/components/cashu/CashuTokenCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CashuWalletLightningCard } from "@/components/cashu/CashuWalletLightningCard";
import { CashuWalletCard } from "@/components/cashu/CashuWalletCard";
import { NutzapCard } from "@/components/cashu/NutzapCard";
import Header from "@/components/ui/Header";
import { Separator } from "@/components/ui/separator";
import { useCashuToken } from "@/hooks/useCashuToken";
import { useToast } from "@/hooks/useToast";
import { Loader2 } from "lucide-react";

export function CashuWallet() {
  const { user } = useCurrentUser();
  const { receiveToken } = useCashuToken();
  const { toast } = useToast();
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [processedTokens, setProcessedTokens] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleTokenFromUrl = async () => {
      // Check if there's a token in the URL hash
      const hash = window.location.hash;
      if (hash && hash.includes("token=")) {
        // Extract the token from the hash
        const tokenMatch = hash.match(/token=([^&]+)/);
        if (tokenMatch && tokenMatch[1]) {
          const token = tokenMatch[1];
          
          // Check if we've already processed this token to avoid duplicates
          if (processedTokens.has(token)) {
            return;
          }

          setIsProcessingToken(true);
          
          try {
            // Receive the token
            const proofs = await receiveToken(token);
            
            // Calculate total amount
            const totalAmount = proofs.reduce((sum, p) => sum + p.amount, 0);
            
            // Show success toast
            toast({
              title: "Token Redeemed Successfully!",
              description: `You've received ${totalAmount} sats`,
            });
            
            // Add to processed tokens
            setProcessedTokens(prev => new Set([...prev, token]));
            
            // Clean up the URL by removing the token from the hash
            window.history.replaceState(null, "", window.location.pathname);
          } catch (error) {
            console.error("Error receiving token from URL:", error);
            toast({
              title: "Failed to redeem token",
              description: error instanceof Error ? error.message : "Unknown error occurred",
              variant: "destructive",
            });
          } finally {
            setIsProcessingToken(false);
          }
        }
      }
    };

    // Only process if user is logged in
    if (user) {
      handleTokenFromUrl();
    }
  }, [user, receiveToken, toast, processedTokens]);

  return (
    <div className="container mx-auto py-3 px-3 sm:px-4">
      <Header />
      <Separator className="my-4" />

      {isProcessingToken && (
        <div className="mb-6 p-4 bg-muted rounded-lg flex items-center space-x-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing Cashu token from URL...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CashuWalletCard />
        <CashuWalletLightningCard />
        {/* <NutzapCard /> */}
        {/* <CashuTokenCard /> */}
        <CashuHistoryCard />
      </div>

      {!user && (
        <div className="mt-8 p-4 bg-muted rounded-lg text-center">
          <p className="text-lg font-medium">Log in to use your Cashu wallet</p>
          <p className="text-muted-foreground">
            Your wallet data is stored encrypted on Nostr relays and follows you
            across applications.
          </p>
        </div>
      )}
    </div>
  );
}

export default CashuWallet;
