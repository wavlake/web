import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useNostrPublish } from "./useNostrPublish";
import { NostrEvent } from "@nostrify/nostrify";
import { KINDS } from "@/lib/nostr-kinds";
import { toast } from "sonner";

export interface GroupModerationHookProps {
  communityId: string;
  selectedCommunity: NostrEvent | null;
}

export function useGroupModeration({ communityId, selectedCommunity }: GroupModerationHookProps) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  // Check if current user is the owner of the community
  const isOwner = selectedCommunity && user && selectedCommunity.pubkey === user.pubkey;

  const promoteToModerator = useMutation({
    mutationFn: async (pubkey: string) => {
      if (!selectedCommunity || !user || !isOwner) {
        throw new Error("Unauthorized: Only the community owner can promote moderators");
      }

      // Check if user is already a moderator
      const isAlreadyModerator = selectedCommunity.tags.some(
        (tag) => tag[0] === "p" && tag[1] === pubkey && tag[3] === "moderator"
      );

      if (isAlreadyModerator) {
        throw new Error("User is already a moderator");
      }

      // Create updated tags array with new moderator
      const newTags = [
        ...selectedCommunity.tags,
        ["p", pubkey, "", "moderator"]
      ];

      // Create new group definition event
      const updatedGroupEvent = {
        kind: KINDS.GROUP,
        content: selectedCommunity.content,
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return new Promise<void>((resolve, reject) => {
        publishEvent(updatedGroupEvent, {
          onSuccess: () => {
            toast.success("User promoted to moderator successfully");
            resolve();
          },
          onError: (error) => {
            toast.error("Failed to promote user to moderator");
            reject(error);
          },
        });
      });
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["approved-members", communityId] });
      queryClient.invalidateQueries({ queryKey: ["community-context"] });
    },
  });

  const demoteFromModerator = useMutation({
    mutationFn: async (pubkey: string) => {
      if (!selectedCommunity || !user || !isOwner) {
        throw new Error("Unauthorized: Only the community owner can demote moderators");
      }

      // Check if user is actually a moderator
      const isCurrentlyModerator = selectedCommunity.tags.some(
        (tag) => tag[0] === "p" && tag[1] === pubkey && tag[3] === "moderator"
      );

      if (!isCurrentlyModerator) {
        throw new Error("User is not currently a moderator");
      }

      // Remove moderator tag from tags array
      const newTags = selectedCommunity.tags.filter(
        (tag) => !(tag[0] === "p" && tag[1] === pubkey && tag[3] === "moderator")
      );

      // Create new group definition event
      const updatedGroupEvent = {
        kind: KINDS.GROUP,
        content: selectedCommunity.content,
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      };

      return new Promise<void>((resolve, reject) => {
        publishEvent(updatedGroupEvent, {
          onSuccess: () => {
            toast.success("Moderator demoted to member successfully");
            resolve();
          },
          onError: (error) => {
            toast.error("Failed to demote moderator");
            reject(error);
          },
        });
      });
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["approved-members", communityId] });
      queryClient.invalidateQueries({ queryKey: ["community-context"] });
    },
  });

  return {
    promoteToModerator: promoteToModerator.mutate,
    demoteFromModerator: demoteFromModerator.mutate,
    isPromoting: promoteToModerator.isPending,
    isDemoting: demoteFromModerator.isPending,
    isOwner,
  };
}