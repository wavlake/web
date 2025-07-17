import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { 
  CreateDraftTrackData, 
  CreateDraftAlbumData, 
  DraftTrack, 
  DraftAlbum,
  DRAFT_TRACK_KIND,
  DRAFT_ALBUM_KIND,
  TRACK_KIND,
  ALBUM_KIND
} from "@/types/drafts";
import { 
  encryptDraftContent, 
  createFutureTrackEvent, 
  createFutureAlbumEvent 
} from "@/lib/draftUtils";
import { NostrTrack } from "@/types/music";
import { NostrAlbum } from "@/hooks/useArtistAlbums";
import { toast } from "sonner";

export function useDraftPublish() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  // Save track as draft (encrypted kind 31339)
  const saveDraftTrack = useMutation({
    mutationFn: async (data: CreateDraftTrackData) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Create the future track event structure
      const futureEvent = createFutureTrackEvent(data);
      
      // Encrypt the future event
      const encryptedContent = await encryptDraftContent(
        user.signer,
        user.pubkey,
        futureEvent
      );

      // Generate draft ID
      const draftId = data.draftId || `draft-track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create draft event (kind 31339)
      const draftEvent = {
        kind: DRAFT_TRACK_KIND,
        content: encryptedContent,
        tags: [
          ["d", draftId],
          ["title", `Draft: ${data.title}`], // Public draft title
          ["alt", "Draft music track"]
        ]
      };

      return await publishEvent(draftEvent);
    },
    onSuccess: () => {
      toast.success("Draft track saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["draft-tracks"] });
    },
    onError: (error) => {
      console.error("Failed to save draft track:", error);
      toast.error("Failed to save draft track. Please try again.");
    }
  });

  // Save album as draft (encrypted kind 31340)
  const saveDraftAlbum = useMutation({
    mutationFn: async (data: CreateDraftAlbumData) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Create the future album event structure
      const futureEvent = createFutureAlbumEvent(data);
      
      // Encrypt the future event
      const encryptedContent = await encryptDraftContent(
        user.signer,
        user.pubkey,
        futureEvent
      );

      // Generate draft ID
      const draftId = data.draftId || `draft-album-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create draft event (kind 31340)
      const draftEvent = {
        kind: DRAFT_ALBUM_KIND,
        content: encryptedContent,
        tags: [
          ["d", draftId],
          ["title", `Draft: ${data.title}`], // Public draft title
          ["alt", "Draft music album"]
        ]
      };

      return await publishEvent(draftEvent);
    },
    onSuccess: () => {
      toast.success("Draft album saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["draft-albums"] });
    },
    onError: (error) => {
      console.error("Failed to save draft album:", error);
      toast.error("Failed to save draft album. Please try again.");
    }
  });

  // Publish draft track as final kind 31337 event
  const publishDraftTrack = useMutation({
    mutationFn: async ({ draft, communityId }: { draft: DraftTrack; communityId?: string }) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Create a copy of the future event and add community tags if provided
      const eventToPublish = { ...draft.futureEvent };
      
      // Add community tag if communityId is provided (NIP-72)
      if (communityId) {
        // communityId format: "34550:pubkey:d-identifier"
        const [kind, pubkey, dIdentifier] = communityId.split(":");
        if (kind === "34550" && pubkey && dIdentifier) {
          // Add community tag to existing tags
          eventToPublish.tags = [...eventToPublish.tags, ["a", communityId]];
        } else {
          console.error('Invalid communityId format for draft track:', communityId, 'Expected format: 34550:pubkey:d-identifier');
        }
      }

      // Publish the modified future event
      const publishedEvent = await publishEvent(eventToPublish);

      // Delete the draft by publishing an empty event with same 'd' tag
      const deleteDraftEvent = {
        kind: DRAFT_TRACK_KIND,
        content: "",
        tags: [
          ["d", draft.draftId]
        ]
      };

      await publishEvent(deleteDraftEvent);

      return publishedEvent;
    },
    onSuccess: () => {
      toast.success("Track published successfully!");
      // Invalidate both draft and published track queries
      queryClient.invalidateQueries({ queryKey: ["draft-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artist-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artist-albums-real"] });
    },
    onError: (error) => {
      console.error("Failed to publish draft track:", error);
      toast.error("Failed to publish track. Please try again.");
    }
  });

  // Publish draft album as final kind 31338 event
  const publishDraftAlbum = useMutation({
    mutationFn: async ({ draft, communityId }: { draft: DraftAlbum; communityId?: string }) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Create a copy of the future event and add community tags if provided
      const eventToPublish = { ...draft.futureEvent };
      
      // Add community tag if communityId is provided (NIP-72)
      if (communityId) {
        // communityId format: "34550:pubkey:d-identifier"
        const [kind, pubkey, dIdentifier] = communityId.split(":");
        if (kind === "34550" && pubkey && dIdentifier) {
          // Add community tag to existing tags
          eventToPublish.tags = [...eventToPublish.tags, ["a", communityId]];
        } else {
          console.error('Invalid communityId format for draft album:', communityId, 'Expected format: 34550:pubkey:d-identifier');
        }
      }

      // Publish the modified future event
      const publishedEvent = await publishEvent(eventToPublish);

      // Delete the draft by publishing an empty event with same 'd' tag
      const deleteDraftEvent = {
        kind: DRAFT_ALBUM_KIND,
        content: "",
        tags: [
          ["d", draft.draftId]
        ]
      };

      await publishEvent(deleteDraftEvent);

      return publishedEvent;
    },
    onSuccess: () => {
      toast.success("Album published successfully!");
      // Invalidate both draft and published album queries
      queryClient.invalidateQueries({ queryKey: ["draft-albums"] });
      queryClient.invalidateQueries({ queryKey: ["artist-albums-real"] });
      queryClient.invalidateQueries({ queryKey: ["artist-tracks"] });
    },
    onError: (error) => {
      console.error("Failed to publish draft album:", error);
      toast.error("Failed to publish album. Please try again.");
    }
  });

  // Delete draft without publishing
  const deleteDraft = useMutation({
    mutationFn: async ({ draftId, kind }: { draftId: string; kind: number }) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Delete the draft by publishing an empty event with same 'd' tag
      const deleteDraftEvent = {
        kind: kind === TRACK_KIND ? DRAFT_TRACK_KIND : DRAFT_ALBUM_KIND,
        content: "",
        tags: [
          ["d", draftId]
        ]
      };

      return await publishEvent(deleteDraftEvent);
    },
    onSuccess: (_, variables) => {
      toast.success("Draft deleted successfully!");
      // Invalidate appropriate draft queries
      if (variables.kind === TRACK_KIND) {
        queryClient.invalidateQueries({ queryKey: ["draft-tracks"] });
      } else if (variables.kind === ALBUM_KIND) {
        queryClient.invalidateQueries({ queryKey: ["draft-albums"] });
      }
    },
    onError: (error) => {
      console.error("Failed to delete draft:", error);
      toast.error("Failed to delete draft. Please try again.");
    }
  });

  // Convert published track to draft (delete original and create draft)
  const convertTrackToDraft = useMutation({
    mutationFn: async (track: NostrTrack) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Create draft from published track metadata
      const futureEvent = {
        kind: TRACK_KIND,
        content: track.description || "",
        tags: [
          ["d", track.id.replace('track-', 'track-')], // Keep same identifier
          ["title", track.title],
          ["genre", track.genre],
          ["url", track.audioUrl],
          ["explicit", track.explicit.toString()],
          ...(track.description ? [["description", track.description]] : []),
          ...(track.price && track.price > 0 ? [["price", track.price.toString(), "sat"]] : []),
          ...(track.coverUrl ? [["image", track.coverUrl]] : []),
          ...(track.tags || []).map((tag: string) => ["t", tag]),
        ],
        pubkey: "",
        id: "",
        sig: "",
      };

      // Encrypt the future event
      const encryptedContent = await encryptDraftContent(
        user.signer,
        user.pubkey,
        futureEvent
      );

      // Generate draft ID
      const draftId = `draft-${track.id}`;

      // Create draft event (kind 31339)
      const draftEvent = {
        kind: DRAFT_TRACK_KIND,
        content: encryptedContent,
        tags: [
          ["d", draftId],
          ["title", `Draft: ${track.title}`],
          ["alt", "Draft music track (converted from published)"]
        ]
      };

      // First create the draft
      await publishEvent(draftEvent);

      // Then delete the original published track (kind 5 deletion event)
      const deleteEvent = {
        kind: 5,
        content: "Track converted to draft",
        tags: [
          ["e", track.event.id],
          ["k", TRACK_KIND.toString()]
        ]
      };

      await publishEvent(deleteEvent);

      return { draftEvent, deleteEvent };
    },
    onSuccess: () => {
      toast.success("Track converted to draft successfully!");
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["draft-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artist-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artist-albums-real"] });
    },
    onError: (error) => {
      console.error("Failed to convert track to draft:", error);
      toast.error("Failed to convert track to draft. Please try again.");
    }
  });

  // Convert published album to draft (delete original and create draft)
  const convertAlbumToDraft = useMutation({
    mutationFn: async (album: NostrAlbum) => {
      if (!user?.signer || !user?.pubkey) {
        throw new Error("User not logged in or signer not available");
      }

      // Create draft from published album metadata
      const futureEvent = {
        kind: ALBUM_KIND,
        content: album.description || "",
        tags: [
          ["d", album.id.replace('album-', 'album-')], // Keep same identifier
          ["title", album.title],
          ["artist", album.artist],
          ["genre", album.genre],
          ["explicit", album.explicit.toString()],
          ...(album.description ? [["description", album.description]] : []),
          ...(album.price && album.price > 0 ? [["price", album.price.toString(), "sat"]] : []),
          ...(album.coverUrl ? [["image", album.coverUrl]] : []),
          ...(album.releaseDate ? [["released_at", new Date(album.releaseDate).getTime().toString()]] : []),
          ...(album.upc ? [["upc", album.upc]] : []),
          ...(album.label ? [["label", album.label]] : []),
          // Add track references
          ...album.tracks
            .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0))
            .flatMap((track) => [
              ["e", track.id, "", track.title],
              ["track", (track.trackNumber || 0).toString(), track.id]
            ]),
          // Add custom tags
          ...(album.tags || []).map((tag: string) => ["t", tag]),
        ],
        pubkey: "",
        id: "",
        sig: "",
      };

      // Encrypt the future event
      const encryptedContent = await encryptDraftContent(
        user.signer,
        user.pubkey,
        futureEvent
      );

      // Generate draft ID
      const draftId = `draft-${album.id}`;

      // Create draft event (kind 31340)
      const draftEvent = {
        kind: DRAFT_ALBUM_KIND,
        content: encryptedContent,
        tags: [
          ["d", draftId],
          ["title", `Draft: ${album.title}`],
          ["alt", "Draft music album (converted from published)"]
        ]
      };

      // First create the draft
      await publishEvent(draftEvent);

      // Then delete the original published album (kind 5 deletion event)
      const deleteEvent = {
        kind: 5,
        content: "Album converted to draft",
        tags: [
          ["e", album.event.id],
          ["k", ALBUM_KIND.toString()]
        ]
      };

      await publishEvent(deleteEvent);

      return { draftEvent, deleteEvent };
    },
    onSuccess: () => {
      toast.success("Album converted to draft successfully!");
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["draft-albums"] });
      queryClient.invalidateQueries({ queryKey: ["artist-albums-real"] });
      queryClient.invalidateQueries({ queryKey: ["artist-tracks"] });
    },
    onError: (error) => {
      console.error("Failed to convert album to draft:", error);
      toast.error("Failed to convert album to draft. Please try again.");
    }
  });

  return {
    saveDraftTrack,
    saveDraftAlbum,
    publishDraftTrack,
    publishDraftAlbum,
    deleteDraft,
    convertTrackToDraft,
    convertAlbumToDraft,
    isLoading: saveDraftTrack.isPending || 
               saveDraftAlbum.isPending || 
               publishDraftTrack.isPending || 
               publishDraftAlbum.isPending ||
               deleteDraft.isPending ||
               convertTrackToDraft.isPending ||
               convertAlbumToDraft.isPending,
  };
}