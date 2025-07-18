import { useState } from "react";
import { NLogin, type NLoginType } from "@nostrify/react/login";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { generateSecretKey, nip19 } from "nostr-tools";
import { toast } from "@/hooks/useToast";
import { useSignupCreateCashuWallet } from "@/hooks/auth/useSignupCreateCashuWallet";
import { generateFakeName } from "@/lib/utils";
import { type ProfileData } from "@/types/profile";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface UseCreateAccountReturn {
  isCreating: boolean;
  generatedName: string | null;
  createAccount: () => Promise<{ login: NLoginType; generatedName: string }>;
  setupAccount: (profileData: ProfileData | null, generatedName: string) => Promise<void>;
}

export const useCreateNostrAccount = (): UseCreateAccountReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [generatedName, setGeneratedName] = useState<string | null>(null);

  const { mutateAsync: publishEvent } = useNostrPublish();
  const { user: currentUser } = useCurrentUser();

  // For wallet creation, use the current authenticated user
  // This allows setupAccount to work after addLogin has been called
  const { mutateAsync: createCashuWallet } = useSignupCreateCashuWallet(currentUser || null);

  const createAccount = async (): Promise<{ login: NLoginType; generatedName: string }> => {
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

  const setupAccount = async (profileData: ProfileData | null, generatedName: string): Promise<void> => {
    try {
      // Create Cashu wallet
      await createCashuWallet();

      // Use profile data from form if available, fallback to generated name
      let finalProfileData: ProfileData;
      if (profileData) {
        finalProfileData = { ...profileData };
      } else {
        finalProfileData = { name: generatedName };
      }
      
      await publishEvent({
        kind: 0,
        content: JSON.stringify(finalProfileData),
      });
    } catch (error) {
      // Non-critical errors - continue anyway
      console.error("❌ [useCreateNostrAccount] Error during account setup:", error);
    }
  };

  return {
    isCreating,
    generatedName,
    createAccount,
    setupAccount,
  };
};
