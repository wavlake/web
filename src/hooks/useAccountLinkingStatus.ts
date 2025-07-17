import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createNip98AuthHeader } from "@/lib/nip98Auth";

export interface AccountLinkingStatus {
  isLinked: boolean;
  firebaseUid: string | null;
  email: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the current user's Nostr pubkey is linked to a Firebase account.
 * This is required for uploading tracks and other content creation features.
 */
export function useAccountLinkingStatus(): AccountLinkingStatus {
  const { user } = useCurrentUser();

  const query = useQuery({
    queryKey: ["account-linking-status", user?.pubkey],
    queryFn: async (): Promise<{
      isLinked: boolean;
      firebaseUid: string | null;
      email: string | null;
    }> => {
      if (!user?.pubkey || !user?.signer) {
        return { isLinked: false, firebaseUid: null, email: null };
      }

      try {
        // Use the new API endpoint to check if pubkey is linked
        const API_BASE_URL =
          import.meta.env.VITE_NEW_API_URL ||
          "https://api-cgi4gylh7q-uc.a.run.app/v1";
        const url = `${API_BASE_URL}/auth/check-pubkey-link`;
        const method = "POST";
        const body = { pubkey: user.pubkey };

        // Create NIP-98 auth header
        const authHeader = await createNip98AuthHeader(
          url,
          method,
          body,
          user.signer
        );

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          // If the endpoint fails, we should block uploads for security
          console.error(
            `Account linking check failed with status ${response.status}`
          );
          throw new Error(
            `Account linking check failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return {
          isLinked: data.success && data.is_linked,
          firebaseUid: data.firebase_uid || null,
          email: data.email || null,
        };
      } catch (error) {
        console.error("Failed to check account linking status:", error);
        // Fail closed - block uploads if we can't verify linking status
        throw error;
      }
    },
    enabled: !!user?.pubkey && !!user?.signer,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    isLinked: query.data?.isLinked ?? false, // Default to false for security - block uploads if check fails
    firebaseUid: query.data?.firebaseUid ?? null,
    email: query.data?.email ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Helper function to check if a user can upload content
 * @returns true if user is logged in and has linked account, false otherwise
 */
export function useCanUpload(): boolean {
  const { user } = useCurrentUser();
  const { isLinked, isLoading, error } = useAccountLinkingStatus();

  // User must be logged in with Nostr, have linked account, and no errors occurred during check
  return !!user?.pubkey && !isLoading && !error && isLinked;
}
