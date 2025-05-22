import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { useBannedUsers } from "@/hooks/useBannedUsers";

export type ModeratorAction = "remove_content" | "remove_user" | "ban_user" | "no_action";

export interface ReportActionOptions {
  reportId: string;
  communityId: string;
  pubkey: string;
  eventId?: string;
  action: ModeratorAction;
  reason?: string;
}

export function useReportActions() {
  const { mutateAsync: publishEvent, isPending } = useNostrPublish({
    invalidateQueries: [
      { queryKey: ["group-reports"] },
      { queryKey: ["approved-posts"] },
      { queryKey: ["pending-posts"] }
    ]
  });
  const { user } = useCurrentUser();
  // We'll initialize the hook with the communityId from the options
  const { banUser } = useBannedUsers(options.communityId);

  const handleReportAction = async (options: ReportActionOptions) => {
    if (!user) {
      toast.error("You must be logged in to take action on reports");
      throw new Error("User not logged in");
    }

    const { reportId, communityId, pubkey, eventId, action, reason } = options;

    try {
      // Mark the report as handled
      await publishEvent({
        kind: 1985, // Using kind 1985 (Label) to mark the report as handled
        tags: [
          ["e", reportId],
          ["a", communityId],
          ["l", `report-action:${action}`],
          ["L", "chorus.report.action"]
        ],
        content: reason || `Action taken: ${action}`,
      });

      // Take the appropriate action based on moderator decision
      switch (action) {
        case "remove_content":
          if (eventId) {
            await publishEvent({
              kind: 4551, // Remove post
              tags: [
                ["a", communityId], 
                ["e", eventId], 
                ["p", pubkey], 
                ["k", "1"] // Assuming it's a kind 1 post
              ],
              content: JSON.stringify({ 
                reason: reason || "Removed based on report", 
                timestamp: Date.now() 
              }),
            });
          }
          break;
          
        case "remove_user":
          // Remove user from approved members list
          await publishEvent({
            kind: 14550, // Approved members list
            tags: [
              ["a", communityId],
              ["remove", pubkey]
            ],
            content: "Removed user based on report",
          });
          break;
          
        case "ban_user":
          // Ban the user
          await banUser(pubkey, communityId);
          break;
          
        case "no_action":
          // No additional action needed
          break;
      }

      toast.success("Action taken successfully");
      return true;
    } catch (error) {
      console.error("Error taking action on report:", error);
      toast.error("Failed to take action. Please try again.");
      throw error;
    }
  };

  return {
    handleReportAction,
    isPending
  };
}