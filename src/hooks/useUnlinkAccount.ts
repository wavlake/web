import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

export const useUnlinkAccount = () => {
  const { user: firebaseUser, getAuthToken } = useFirebaseAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pubkey: string) => {
      if (!firebaseUser) {
        throw new Error("User must be logged in to link accounts");
      }
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("Failed to get Firebase auth token");
      }

      // Make the API request to unlink the account
      const response = await fetch(
        `${import.meta.env.VITE_NEW_API_URL}/auth/unlink-pubkey`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            pubkey: pubkey,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to unlink account: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({
        queryKey: ["linked-pubkeys", firebaseUser?.uid],
      });
    },
    onError: (error) => {
      console.error("Failed to unlink account:", error);
      throw error; // Re-throw to allow component to handle it
    },
  });
};
