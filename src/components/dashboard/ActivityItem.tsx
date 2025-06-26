import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { formatRelativeTime } from "@/lib/utils";
import { ActivityItem as ActivityItemType } from "@/hooks/useCommunityContent";

interface ActivityItemProps {
  activity: ActivityItemType;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const author = useAuthor(activity.authorPubkey);
  const authorName =
    author.data?.metadata?.name ||
    author.data?.metadata?.display_name ||
    activity.authorPubkey.slice(0, 8);

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          {author.data?.metadata?.picture ? (
            <img
              src={author.data.metadata.picture}
              alt={authorName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <AvatarFallback>
              {activity.icon || authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{activity.icon}</span>
          <p className="text-sm font-medium truncate">{activity.title}</p>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {activity.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">by {authorName}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
