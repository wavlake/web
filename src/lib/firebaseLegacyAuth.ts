import { useState, useCallback } from "react";
import { handleFirebaseError } from "@/lib/firebase-auth-errors";
import type { NostrEvent } from "@nostrify/nostrify";

// Type for Nostr signer with NIP-44 support
interface NostrSigner {
  getPublicKey: () => Promise<string>;
  signEvent: (event: NostrEvent) => Promise<NostrEvent>;
  nip44?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string>;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
  };
}

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

// Helper to create NIP-98 auth headers
const createAuthHeaders = async (
  firebaseToken: string,
  pubkey: string,
  signer: NostrSigner
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

  const handleFirebaseEmailSignup = useCallback(
    async (email: string, password: string) => {
      const { initializeFirebaseAuth, isFirebaseAuthConfigured } = await import(
        "@/lib/firebaseAuth"
      );

      if (!isFirebaseAuthConfigured()) {
        throw new Error("Firebase authentication is not configured");
      }

      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = initializeFirebaseAuth();

      const userCredential = await createUserWithEmailAndPassword(
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

  const linkPubkey = useCallback(async (pubkey: string, signer: NostrSigner) => {
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

  return {
    isLoading,
    error,
    setError,
    handleError,
    handleFirebaseEmailLogin,
    handleFirebaseEmailSignup,
    linkPubkey,
  };
}