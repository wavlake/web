import { useState } from "react";
import { useNostrLogin, NLogin } from "@nostrify/react/login";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { generateSecretKey, nip19 } from "nostr-tools";
import { toast } from "@/hooks/useToast";
import { useCreateCashuWallet } from "@/hooks/useCreateCashuWallet";
import { generateFakeName } from "@/lib/utils";

interface UseCreateAccountReturn {
  isCreating: boolean;
  generatedName: string | null;
  createAccount: () => Promise<{ login: NLogin; generatedName: string }>;
  setupAccount: (generatedName: string) => Promise<void>;
}

export const useCreateNostrAccount = (): UseCreateAccountReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [generatedName, setGeneratedName] = useState<string | null>(null);

  const { mutateAsync: publishEvent } = useNostrPublish();
  const { mutateAsync: createCashuWallet } = useCreateCashuWallet();

  const createAccount = async (): Promise<{ login: NLogin; generatedName: string }> => {
    setIsCreating(true);

    try {
      // Generate new secret key
      const sk = generateSecretKey();
      const nsec = nip19.nsecEncode(sk);

      // Create login but don't add it yet - let the flow handle login timing
      const login = NLogin.fromNsec(nsec);

      // Generate fake name
      const fakeName = generateFakeName();
      setGeneratedName(fakeName);

      // Return the login and generated name for the flow to handle
      return { login, generatedName: fakeName };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const setupAccount = async (generatedName: string): Promise<void> => {
    try {
      // Create Cashu wallet
      await createCashuWallet();

      // Publish kind:0 metadata
      await publishEvent({
        kind: 0,
        content: JSON.stringify({ name: generatedName }),
      });
    } catch (error) {
      // Non-critical errors - continue anyway
      console.error("Error during account setup:", error);
    }
  };

  return {
    isCreating,
    generatedName,
    createAccount,
    setupAccount,
  };
};
