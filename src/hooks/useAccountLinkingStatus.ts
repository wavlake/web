import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface AccountLinkingStatus {
  isLinked: boolean;
  firebaseUid: string | null;
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
    queryFn: async (): Promise<{ isLinked: boolean; firebaseUid: string | null }> => {
      if (!user?.pubkey) {
        return { isLinked: false, firebaseUid: null };
      }

      try {
        // Use the new API endpoint to check if pubkey is linked
        const API_BASE_URL = import.meta.env.VITE_NEW_API_URL || "https://api-cgi4gylh7q-uc.a.run.app/v1";
        const response = await fetch(`${API_BASE_URL}/auth/check-pubkey-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pubkey: user.pubkey }),
        });

        if (!response.ok) {
          // If the endpoint fails, we should block uploads for security
          console.error(`Account linking check failed with status ${response.status}`);
          throw new Error(`Account linking check failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
          isLinked: data.success && data.is_linked,
          firebaseUid: data.firebase_uid || null,
        };
      } catch (error) {
        console.error("Failed to check account linking status:", error);
        // Fail closed - block uploads if we can't verify linking status
        throw error;
      }
    },
    enabled: !!user?.pubkey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    isLinked: query.data?.isLinked ?? false, // Default to false for security - block uploads if check fails
    firebaseUid: query.data?.firebaseUid ?? null,
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