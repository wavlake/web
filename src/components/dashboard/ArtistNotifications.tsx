import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  UserPlus,
  Coins,
  Heart,
  Music,
  Disc,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useArtistNotifications } from "@/hooks/useArtistNotifications";
import { useMarkNotificationAsRead } from "@/hooks/useNotifications";
import type { Notification } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { formatDistanceToNow } from "date-fns";
import { GroupReference } from "@/components/groups/GroupReference";

interface ArtistNotificationItemProps {
  notification: Notification;
  compact?: boolean;
}

function ArtistNotificationItem({ notification, compact = false }: ArtistNotificationItemProps) {
  const { data: authorData } = useAuthor(notification.pubkey || "");
  const authorName = authorData?.metadata?.name || notification.pubkey?.slice(0, 8) || "Unknown";
  const authorPicture = authorData?.metadata?.picture;

  let linkTo = "";
  let linkText = "View";

  switch (notification.type) {
    case "join_request":
      if (notification.groupId) {
        linkTo = `/group/${notification.groupId}/settings?tab=members&membersTab=requests`;
        linkText = "Manage";
      }
      break;
    case "report":
    case "report_action":
      if (notification.groupId) {
        linkTo = `/group/${notification.groupId}/settings?tab=reports`;
        linkText = "View report";
      }
      break;
    case "track_published":
    case "album_published":
    case "track_reaction":
    case "album_reaction":
      linkTo = `/dashboard#music`;
      linkText = "View music";
      break;
    case "nutzap_received":
      linkTo = `/dashboard#wallet`;
      linkText = "View wallet";
      break;
    case "nutzap_track":
    case "nutzap_album":
    case "nutzap_post":
      linkTo = `/dashboard#music`;
      linkText = "View details";
      break;
  }

  const getNotificationIcon = () => {
    switch (notification.type) {
      case "report":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "report_action":
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case "join_request":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case "track_published":
        return <Music className="w-4 h-4 text-purple-500" />;
      case "album_published":
        return <Disc className="w-4 h-4 text-indigo-500" />;
      case "track_reaction":
      case "album_reaction":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "nutzap_received":
      case "nutzap_track":
      case "nutzap_album":
      case "nutzap_post":
        return <Coins className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${notification.read ? "opacity-70" : "bg-muted/50"}`}>
        <div className="flex-shrink-0">
          {getNotificationIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {notification.message}
            {notification.nutzapAmount && (
              <span className="text-orange-600 font-semibold ml-1">
                (+{notification.nutzapAmount} sats)
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(notification.createdAt * 1000, { addSuffix: true })}
          </p>
        </div>
        {linkTo && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
            <Link to={linkTo}>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`mb-3 ${notification.read ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {notification.pubkey && (
              notification.type === "track_reaction" ||
              notification.type === "album_reaction" ||
              notification.type === "nutzap_track" ||
              notification.type === "nutzap_album" ||
              notification.type === "nutzap_post"
            ) ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={authorPicture} />
                <AvatarFallback>{authorName[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full">
                {getNotificationIcon()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">
              {notification.pubkey && (
                notification.type === "track_reaction" ||
                notification.type === "album_reaction" ||
                notification.type === "nutzap_track" ||
                notification.type === "nutzap_album" ||
                notification.type === "nutzap_post"
              ) && `${authorName} `}
              {notification.message}
              {notification.nutzapAmount && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                  +{notification.nutzapAmount} sats
                </Badge>
              )}
            </div>
            
            {(notification.trackTitle || notification.albumTitle) && (
              <p className="text-sm text-muted-foreground mt-1">
                "{notification.trackTitle || notification.albumTitle}"
                {notification.artistName && ` by ${notification.artistName}`}
              </p>
            )}
            
            {notification.nutzapComment && (
              <p className="text-sm text-muted-foreground mt-1 italic">
                "{notification.nutzapComment}"
              </p>
            )}
            
            {notification.groupId && (
              <div className="mt-2">
                <GroupReference groupId={notification.groupId} />
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(notification.createdAt * 1000, { addSuffix: true })}
              </p>
              
              {linkTo && (
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link to={linkTo}>{linkText}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ArtistNotificationsProps {
  compact?: boolean;
  maxItems?: number;
}

export function ArtistNotifications({ compact = false, maxItems }: ArtistNotificationsProps) {
  const { data: notifications = [], isLoading, unreadCount } = useArtistNotifications();
  const markAsRead = useMarkNotificationAsRead();

  // Auto-mark notifications as read when viewed (only in non-compact mode)
  useEffect(() => {
    if (!compact && notifications.length > 0) {
      const timer = setTimeout(() => {
        for (const notification of notifications.slice(0, maxItems || notifications.length)) {
          if (!notification.read) {
            markAsRead(notification.id);
          }
        }
      }, 1000); // Wait 1 second before marking as read

      return () => clearTimeout(timer);
    }
  }, [notifications, markAsRead, compact, maxItems]);

  const displayNotifications = maxItems ? notifications.slice(0, maxItems) : notifications;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No artist notifications</p>
        <p className="text-xs mt-1">Revenue and engagement notifications will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayNotifications.map((notification) => (
        <ArtistNotificationItem
          key={notification.id}
          notification={notification}
          compact={compact}
        />
      ))}
      
      {maxItems && notifications.length > maxItems && (
        <div className="text-center pt-4">
          <Button variant="link" asChild>
            <Link to="/dashboard#updates">
              View all {notifications.length} notifications
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}