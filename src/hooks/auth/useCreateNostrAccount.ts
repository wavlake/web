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
  createAccount: () => Promise<void>;
}

export const useCreateNostrAccount = (): UseCreateAccountReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [generatedName, setGeneratedName] = useState<string | null>(null);

  const { addLogin } = useNostrLogin();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { mutateAsync: createCashuWallet } = useCreateCashuWallet();

  const createAccount = async () => {
    setIsCreating(true);

    try {
      // Generate new secret key
      const sk = generateSecretKey();
      const nsec = nip19.nsecEncode(sk);

      // Create login and sign in
      const login = NLogin.fromNsec(nsec);
      addLogin(login);

      // Generate fake name
      const fakeName = generateFakeName();
      setGeneratedName(fakeName);

      // Wait for login to be available (since addLogin is sync but state update is async)
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        // Create Cashu wallet
        await createCashuWallet();

        // Publish kind:0 metadata
        await publishEvent({
          kind: 0,
          content: JSON.stringify({ name: fakeName }),
        });
      } catch (error) {
        // Non-critical errors - continue anyway
        console.error("Error during account setup:", error);
      }
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

  return {
    isCreating,
    generatedName,
    createAccount,
  };
};
