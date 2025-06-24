import { useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { createNip98AuthHeader } from "@/lib/nip98Auth";

interface UploadAudioResponse {
  id: string;
  userId: string;
  pubkey: string;
  liveUrl: string;
  rawUrl: string;
}

interface CatalogApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Catalog API base URL - use proxy in development to avoid CSP issues
const CATALOG_API_BASE_URL = import.meta.env.DEV
  ? "/api/catalog"
  : import.meta.env.VITE_CATALOG_API_URL || "http://localhost:3210/v1";

export function useUploadAudio() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      audioFile,
    }: {
      audioFile: File;
    }): Promise<UploadAudioResponse> => {
      if (!user || !user.signer) {
        throw new Error("Must be logged in with Nostr to upload audio");
      }

      if (!audioFile.type.startsWith("audio/")) {
        throw new Error("File must be an audio file");
      }

      // Extract file extension
      const extension = audioFile.name.split(".").pop()?.toLowerCase();
      if (
        !extension ||
        !["mp3", "wav", "flac", "m4a", "aac"].includes(extension)
      ) {
        throw new Error(
          "Unsupported audio format. Please use MP3, WAV, FLAC, M4A, or AAC."
        );
      }

      const url = `${CATALOG_API_BASE_URL}/tracks/nostr`;
      const method = "POST";
      const body = {
        extension: extension,
      };

      // Create NIP-98 auth header
      const authHeader = await createNip98AuthHeader(
        url,
        method,
        body,
        user.signer
      );

      // Prepare headers with NIP-98 auth
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: authHeader,
      };

      // Step 1: Create track record and get presigned URL
      const createTrackResponse = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (!createTrackResponse.ok) {
        const errorData = await createTrackResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to create track: ${createTrackResponse.statusText}`
        );
      }

      const createTrackData: CatalogApiResponse<
        UploadAudioResponse & { presignedUrl: string }
      > = await createTrackResponse.json();

      if (!createTrackData.success || !createTrackData.data.presignedUrl) {
        throw new Error(createTrackData.error || "Failed to get upload URL");
      }

      // Step 2: Upload audio file to S3 using presigned URL
      const uploadResponse = await fetch(createTrackData.data.presignedUrl, {
        method: "PUT",
        body: audioFile,
        headers: {
          "Content-Type": audioFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload audio file: ${uploadResponse.statusText}`
        );
      }

      // Return the track data (without presignedUrl)
      const { presignedUrl, ...trackData } = createTrackData.data;
      return trackData;
    },
  });
}

export type { UploadAudioResponse };
