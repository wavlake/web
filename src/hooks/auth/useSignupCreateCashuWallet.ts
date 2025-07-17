import { useMutation } from "@tanstack/react-query";
import { NUser } from "@nostrify/react/login";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { useCashuStore } from "@/stores/cashuStore";
import { defaultMints } from "@/lib/cashu";
import { generateSecretKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Hook for creating a Cashu wallet during signup flow using a specific user object
 * 
 * Unlike useCreateCashuWallet, this hook accepts a user parameter directly
 * instead of relying on useCurrentUser(), making it suitable for use during
 * the delayed login phase of signup.
 *
 * @param user - The NUser object to create the wallet for
 * @returns A mutation for creating a Cashu wallet
 */
export function useSignupCreateCashuWallet(user: NUser | null) {
  const { createWallet } = useCashuWallet();
  const cashuStore = useCashuStore();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("User required for wallet creation");
      }

      try {
        const privkey = bytesToHex(generateSecretKey());
        cashuStore.setPrivkey(privkey);

        // Create a new wallet with the default mint
        const mints = cashuStore.mints.map((m) => m.url);
        // add default mints
        mints.push(...defaultMints);

        createWallet({
          privkey,
          mints,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to derive private key:", error);
        throw new Error("Failed to create wallet. Please try again.");
      }
    },
  });
}