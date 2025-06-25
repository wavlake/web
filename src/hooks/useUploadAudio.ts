import { useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useNostrPublish } from "./useNostrPublish";
import { createNip98AuthHeader } from "@/lib/nip98Auth";

interface NostrTrackResponse {
  id: string;
  firebase_uid: string;
  pubkey: string;
  original_url: string;
  compressed_url?: string;
  presigned_url: string;
  extension: string;
  is_processing: boolean;
  is_compressed: boolean;
  duration?: number;
  size?: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface TrackProcessingStatus {
  id: string;
  original_url: string;
  compressed_url?: string;
  is_processing: boolean;
  is_compressed: boolean;
  duration?: number;
  size?: number;
}

interface PublishTrackEventOptions {
  title: string;
  description?: string;
  originalUrl: string;
  compressedUrl?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}

// New API base URL - your Cloud Run service
const API_BASE_URL =
  import.meta.env.VITE_NEW_API_URL || "https://api-cgi4gylh7q-uc.a.run.app/v1";

// Hook for uploading audio files to GCS and getting track URLs
export function useUploadAudio() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      audioFile,
    }: {
      audioFile: File;
    }): Promise<NostrTrackResponse> => {
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
        !["mp3", "wav", "flac", "m4a", "aac", "ogg", "aiff", "au"].includes(
          extension
        )
      ) {
        throw new Error(
          "Unsupported audio format. Please use MP3, WAV, FLAC, M4A, AAC, OGG, AIFF, or AU."
        );
      }

      const url = `${API_BASE_URL}/tracks/nostr`;
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

      // Step 1: Create track record and get presigned URL
      const createTrackResponse = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!createTrackResponse.ok) {
        const errorData = await createTrackResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to create track: ${createTrackResponse.statusText}`
        );
      }

      const createTrackData: ApiResponse<NostrTrackResponse> =
        await createTrackResponse.json();

      if (!createTrackData.success || !createTrackData.data.presigned_url) {
        throw new Error(createTrackData.error || "Failed to get upload URL");
      }

      // Step 2: Upload audio file to GCS using presigned URL
      const uploadResponse = await fetch(createTrackData.data.presigned_url, {
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

      // Return the track data
      return createTrackData.data;
    },
  });
}

// Hook for checking the processing status of an uploaded track
export function useTrackProcessingStatus() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (trackId: string): Promise<TrackProcessingStatus> => {
      if (!user || !user.signer) {
        throw new Error("Must be logged in with Nostr to check track status");
      }

      const url = `${API_BASE_URL}/tracks/${trackId}/status`;
      const method = "GET";

      // Create NIP-98 auth header
      const authHeader = await createNip98AuthHeader(
        url,
        method,
        {},
        user.signer
      );

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to get track status: ${response.statusText}`
        );
      }

      const data: ApiResponse<TrackProcessingStatus> = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get track status");
      }

      return data.data;
    },
  });
}

// Hook for publishing a kind 31337 audio event to Nostr
export function usePublishAudioEvent() {
  const { mutateAsync: publishEvent } = useNostrPublish();

  return useMutation({
    mutationFn: async (options: PublishTrackEventOptions) => {
      const {
        title,
        description,
        originalUrl,
        compressedUrl,
        duration,
        fileSize,
        mimeType,
      } = options;

      // Create tags for the audio event
      const tags: string[][] = [
        ["d", crypto.randomUUID()], // Unique identifier for replaceable event
        ["title", title],
        ["url", compressedUrl || originalUrl], // Primary streaming URL
      ];

      // Add description if provided
      if (description) {
        tags.push(["description", description]);
      }

      // Add original URL if different from compressed
      if (compressedUrl && originalUrl !== compressedUrl) {
        tags.push(["alt_url", originalUrl]);
        tags.push(["alt_url_quality", "original"]);
      }

      // Add duration if available
      if (duration) {
        tags.push(["duration", duration.toString()]);
      }

      // Add file metadata
      if (fileSize) {
        tags.push(["size", fileSize.toString()]);
      }

      if (mimeType) {
        tags.push(["m", mimeType]);
      }

      // Add format tags
      if (compressedUrl) {
        tags.push(["format", "mp3"]); // Compressed version is always MP3
      }

      if (originalUrl && originalUrl !== compressedUrl) {
        const originalExtension = originalUrl.split(".").pop()?.toLowerCase();
        if (originalExtension) {
          tags.push(["alt_format", originalExtension]);
        }
      }

      // Create the event content
      const content = `🎵 ${title}${description ? `\n\n${description}` : ""}`;

      // Publish kind 31337 event
      const event = await publishEvent({
        kind: 31337, // Audio track event kind
        content,
        tags,
      });

      return event;
    },
  });
}

export type {
  NostrTrackResponse,
  TrackProcessingStatus,
  PublishTrackEventOptions,
};
