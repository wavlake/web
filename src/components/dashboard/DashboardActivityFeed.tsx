import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDashboardActivity, DashboardActivity } from "@/hooks/useDashboardActivity";
import { useAuthor } from "@/hooks/useAuthor";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { 
  MessageSquare, 
  Music, 
  UserPlus, 
  Heart, 
  Disc,
  Users,
  ExternalLink
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItemProps {
  activity: DashboardActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const { data: authorData } = useAuthor(activity.pubkey || "");
  const authorName = authorData?.metadata?.name || activity.pubkey?.slice(0, 8) || "Unknown";
  const authorPicture = authorData?.metadata?.picture;

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'group_post':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'music_published':
        return activity.trackTitle ? 
          <Music className="h-4 w-4 text-purple-500" /> : 
          <Disc className="h-4 w-4 text-indigo-500" />;
      case 'group_member_approved':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'music_reaction':
      case 'group_post_reaction':
        return <Heart className="h-4 w-4 text-red-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNavigationLink = () => {
    switch (activity.type) {
      case 'group_post':
      case 'group_post_reaction':
        if (activity.groupId && activity.eventId) {
          return `/group/${activity.groupId}?post=${activity.eventId}`;
        } else if (activity.groupId) {
          return `/group/${activity.groupId}`;
        }
        break;
      case 'group_member_approved':
        if (activity.groupId) {
          return `/group/${activity.groupId}/settings?tab=members`;
        }
        break;
      case 'music_published':
      case 'music_reaction':
        return `/dashboard#music`;
      default:
        return null;
    }
    return null;
  };

  const linkTo = getNavigationLink();

  return (
    <div className="flex items-start space-x-3 py-2">
      <div className="flex-shrink-0 relative">
        {activity.pubkey && activity.type !== 'music_published' ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={authorPicture} />
            <AvatarFallback className="text-xs">{authorName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {getActivityIcon()}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border">
          {getActivityIcon()}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {activity.pubkey && activity.type !== 'music_published' && (
                <span className="font-medium">{authorName} </span>
              )}
              <span className={activity.type === 'music_published' ? 'font-medium' : ''}>
                {activity.message}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(activity.createdAt * 1000, { addSuffix: true })}
            </p>
          </div>
          
          {linkTo && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2" asChild>
              <Link to={linkTo}>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardActivityFeed() {
  const { data: activities = [], isLoading, error } = useDashboardActivity();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start space-x-3 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Unable to load recent activity</p>
        <p className="text-xs mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs mt-1">Activity from your groups and music will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}