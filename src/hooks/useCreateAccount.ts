import { useState } from "react";
import { generateSecretKey, nip19 } from "nostr-tools";
import { NLogin, NLoginType, useNostrLogin } from "@nostrify/react/login";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCreateCashuWallet } from "@/hooks/useCreateCashuWallet";
import { generateFakeName } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

interface CreateAccountOptions {
  /** Whether to generate and publish a fake name for the new account */
  generateName?: boolean;
  /** Custom name to use instead of generating a fake one */
  customName?: string;
  /** Whether to create a Cashu wallet for the new account */
  createWallet?: boolean;
  /** Callback to call when account creation is complete */
  onComplete?: (result: { login: NLoginType; pubkey: string; name?: string }) => void;
  /** Callback to call when account creation fails */
  onError?: (error: Error) => void;
}

interface CreateAccountResult {
  login: NLoginType;
  pubkey: string;
  name?: string;
}

/**
 * Hook for creating new Nostr accounts with optional metadata publishing and wallet creation
 */
export function useCreateAccount() {
  const [isCreating, setIsCreating] = useState(false);
  const { addLogin } = useNostrLogin();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { mutateAsync: createCashuWallet } = useCreateCashuWallet();

  const createAccount = async (options: CreateAccountOptions = {}): Promise<CreateAccountResult> => {
    const {
      generateName = true,
      customName,
      createWallet = true,
      onComplete,
      onError,
    } = options;

    setIsCreating(true);

    try {
      // Generate new secret key and login
      const sk = generateSecretKey();
      const nsec = nip19.nsecEncode(sk);
      const login = NLogin.fromNsec(nsec);
      const pubkey = login.pubkey;

      // Add login to the system
      addLogin(login);

      let name: string | undefined;

      // Handle name generation/setting
      if (generateName || customName) {
        name = customName || generateFakeName();
      }

      // Wait for login to be available (since addLogin is sync but state update is async)
      setTimeout(async () => {
        try {
          // Create wallet if requested
          if (createWallet) {
            await createCashuWallet();
          }

          // Publish metadata if name is provided
          if (name) {
            await publishEvent({
              kind: 0,
              content: JSON.stringify({ name }),
            });
          }
        } catch (error) {
          console.warn("Background tasks failed:", error);
          // Don't fail the entire account creation for background tasks
        }
      }, 100);

      const result = { login, pubkey, name };

      // Call completion callback
      onComplete?.(result);

      return result;
    } catch (error) {
      const accountError = error instanceof Error ? error : new Error("Failed to create account");
      
      // Show toast notification
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });

      // Call error callback
      onError?.(accountError);

      throw accountError;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createAccount,
    isCreating,
  };
}