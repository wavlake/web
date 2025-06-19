import { useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { usePublishingAuth } from "./usePublishingAuth";

interface UploadWavlakeAudioOptions {
  title: string;
  artist: string;
  albumId?: string;
  order?: number;
  lyrics?: string;
  isExplicit?: boolean;
}

interface UploadWavlakeAudioResponse {
  id: string;
  artistId: string;
  albumId: string;
  title: string;
  order: number;
  liveUrl: string;
  rawUrl: string;
  lyrics?: string;
  isExplicit: boolean;
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

export function useUploadWavlakeAudio() {
  const { user } = useCurrentUser();
  const { canPublish, firebaseToken } = usePublishingAuth();

  return useMutation({
    mutationFn: async ({
      audioFile,
      options,
    }: {
      audioFile: File;
      options: UploadWavlakeAudioOptions;
    }): Promise<UploadWavlakeAudioResponse> => {
      if (!user) {
        throw new Error("Must be logged in to upload audio");
      }

      if (!canPublish || !firebaseToken) {
        throw new Error("Publishing features must be enabled to upload audio");
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

      // Prepare headers with Firebase token
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${firebaseToken}`,
      };

      // Step 1: Create track record and get presigned URL
      const createTrackResponse = await fetch(
        `${CATALOG_API_BASE_URL}/tracks`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: options.title.trim(),
            order: options.order?.toString() || "1",
            lyrics: options.lyrics || "",
            extension: extension,
            albumId: options.albumId,
            isExplicit: options.isExplicit || false,
          }),
        }
      );

      if (!createTrackResponse.ok) {
        const errorData = await createTrackResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to create track: ${createTrackResponse.statusText}`
        );
      }

      const createTrackData: CatalogApiResponse<
        UploadWavlakeAudioResponse & { presignedUrl: string }
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

export type { UploadWavlakeAudioOptions, UploadWavlakeAudioResponse };
