import { useState, useCallback } from "react";
import { nip19, finalizeEvent } from "nostr-tools";
import { NLogin, NUser } from "@nostrify/react/login";
import { useNostr } from "@nostrify/react";
import type { NostrEvent } from "@nostrify/nostrify";
import { handleFirebaseError } from "@/lib/firebase-auth-errors";
import type { LinkedPubkeysResponse } from "./types";

// Helper to get API URLs
const getApiUrls = () => {
  const authApiUrl = import.meta.env.VITE_NEW_API_URL;
  const actualServerUrl = import.meta.env.DEV
    ? "https://api-854568123236.us-central1.run.app/v1"
    : authApiUrl || "https://api-854568123236.us-central1.run.app/v1";

  return {
    fetchUrl: `${authApiUrl}/auth/link-pubkey`,
    nip98Url: `${actualServerUrl}/auth/link-pubkey`,
  };
};

// Helper to create NIP-98 auth header
const createAuthHeaders = async (
  firebaseToken: string,
  pubkey: string,
  signer: any
) => {
  const { fetchUrl, nip98Url } = getApiUrls();
  const method = "POST";
  const body = { pubkey };

  const { createNip98AuthHeader } = await import("@/lib/nip98Auth");
  const nostrAuthHeader = await createNip98AuthHeader(
    nip98Url,
    method,
    body,
    signer
  );

  return {
    fetchUrl,
    headers: {
      Authorization: `Bearer ${firebaseToken}`,
      "X-Nostr-Authorization": nostrAuthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
};

export function useFirebaseLegacyAuth() {
  const { nostr } = useNostr();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    handleFirebaseError(error, defaultMessage, setError);
  }, []);

  const handleFirebaseEmailLogin = useCallback(
    async (email: string, password: string) => {
      const { initializeFirebaseAuth, isFirebaseAuthConfigured } = await import(
        "@/lib/firebaseAuth"
      );

      if (!isFirebaseAuthConfigured()) {
        throw new Error("Firebase authentication is not configured");
      }

      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = initializeFirebaseAuth();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseToken = await userCredential.user.getIdToken();

      // Store token for later use
      sessionStorage.setItem("firebaseToken", firebaseToken);

      return firebaseToken;
    },
    []
  );

  const linkPubkey = useCallback(async (pubkey: string, signer: any) => {
    const firebaseToken = sessionStorage.getItem("firebaseToken");
    if (!firebaseToken) throw new Error("No Firebase token found");

    const { fetchUrl, headers, body } = await createAuthHeaders(
      firebaseToken,
      pubkey,
      signer
    );

    const response = await fetch(fetchUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to link pubkey");
    }

    return response.json();
  }, []);

  const getLinkedPubkeys = useCallback(
    async (firebaseToken: string): Promise<LinkedPubkeysResponse> => {
      const authApiUrl = import.meta.env.VITE_NEW_API_URL;
      const response = await fetch(`${authApiUrl}/auth/get-linked-pubkeys`, {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check linked pubkeys");
      }

      return response.json();
    },
    []
  );

  const createAuthHandler = useCallback(
    (
      handler: () => Promise<{
        login: any;
        pubkey: string;
        signer: { signEvent: (event: NostrEvent) => Promise<NostrEvent> };
      }>,
      isForAuthentication = false
    ) => {
      return async () => {
        setError(null);
        setIsLoading(true);

        try {
          const { login, pubkey, signer } = await handler();

          if (isForAuthentication) {
            // For authentication, we're verifying an existing linked pubkey
            return { login, pubkey };
          } else {
            // For new links, we need to link the pubkey to Firebase
            await linkPubkey(pubkey, signer);
            return { login, pubkey };
          }
        } catch (error: any) {
          handleError(
            error,
            isForAuthentication
              ? "Authentication failed"
              : "Failed to link Nostr identity"
          );
          throw error;
        } finally {
          setIsLoading(false);
        }
      };
    },
    [linkPubkey, handleError]
  );

  const handleExtensionLogin = createAuthHandler(async () => {
    const login = await NLogin.fromExtension();
    const user = NUser.fromExtensionLogin(login);

    return {
      login,
      pubkey: login.pubkey,
      signer: user.signer,
    };
  });

  const handleNsecLogin = useCallback(async (nsec: string) => {
    if (!nsec.trim()) throw new Error("Please enter an nsec");
    const login = NLogin.fromNsec(nsec);
    const { type, data: sk } = nip19.decode(nsec);
    if (type !== "nsec") throw new Error("Invalid nsec format");

    const signerFunction = async (event: NostrEvent) => {
      return finalizeEvent(event, sk as Uint8Array);
    };

    return {
      login,
      pubkey: login.pubkey,
      signer: { signEvent: signerFunction },
    };
  }, []);

  const handleBunkerLogin = useCallback(
    async (bunkerUri: string) => {
      if (!bunkerUri.trim()) throw new Error("Please enter a bunker URI");
      const login = await NLogin.fromBunker(bunkerUri, nostr);
      const user = NUser.fromBunkerLogin(login, nostr);

      return {
        login,
        pubkey: login.pubkey,
        signer: user.signer,
      };
    },
    [nostr]
  );

  return {
    isLoading,
    error,
    setError,
    handleError,
    handleFirebaseEmailLogin,
    linkPubkey,
    getLinkedPubkeys,
    handleExtensionLogin,
    handleNsecLogin,
    handleBunkerLogin,
    createAuthHandler,
  };
}
