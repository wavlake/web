import type { NostrEvent } from "@nostrify/nostrify";

/**
 * Helper function to check if a group/community has the Wavlake client tag
 * Only groups with client:wavlake tag should be shown in the Wavlake app
 */
export const hasWavlakeClientTag = (event: NostrEvent): boolean => {
  return event.tags.some(
    ([tag, client]) => tag === "client" && client === "wavlake"
  );
};