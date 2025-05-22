import { useState, useEffect } from "react";
import { useNostr } from "@/hooks/useNostr";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBannedUsers } from "@/hooks/useBannedUsers";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthor } from "@/hooks/useAuthor";
import { toast } from "sonner";
import { UserPlus, Users, CheckCircle, XCircle, UserX, Ban } from "lucide-react";
import { NostrEvent } from "@nostrify/nostrify";
import { Link, useLocation } from "react-router-dom";

interface MemberManagementProps {
  communityId: string;
  isModerator: boolean;
}

export function MemberManagement({ communityId, isModerator }: MemberManagementProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const location = useLocation();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { 
    bannedUsers: uniqueBannedUsers, 
    isLoading: isLoadingBanned, 
    banUser, 
    unbanUser 
  } = useBannedUsers(communityId);
  const [activeTab, setActiveTab] = useState("requests");
  
  // Check URL parameters for tab selection
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const membersTab = searchParams.get('membersTab');
    
    if (membersTab && ['requests', 'members', 'declined', 'banned'].includes(membersTab)) {
      setActiveTab(membersTab);
    }
  }, [location.search]);

  // Query for join requests
  const { data: joinRequests, isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["join-requests", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{ 
        kinds: [4552],
        "#a": [communityId],
        limit: 50,
      }], { signal });
      
      return events;
    },
    enabled: !!nostr && !!communityId,
  });

  // Query for approved members
  const { data: approvedMembersEvents, isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ["approved-members", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{ 
        kinds: [14550],
        "#a": [communityId],
        limit: 10,
      }], { signal });
      
      return events;
    },
    enabled: !!nostr && !!communityId,
  });

  // Query for declined users
  const { data: declinedUsersEvents, isLoading: isLoadingDeclined, refetch: refetchDeclined } = useQuery({
    queryKey: ["declined-users", communityId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{ 
        kinds: [14551],
        "#a": [communityId],
        limit: 50,
      }], { signal });
      
      return events;
    },
    enabled: !!nostr && !!communityId,
  });

  // Extract all approved member pubkeys from the events
  const approvedMembers = approvedMembersEvents?.flatMap(event => 
    event.tags.filter(tag => tag[0] === "p").map(tag => tag[1])
  ) || [];

  // Remove duplicates
  const uniqueApprovedMembers = [...new Set(approvedMembers)];

  // Extract all declined user pubkeys from the events
  const declinedUsers = declinedUsersEvents?.flatMap(event => 
    event.tags.filter(tag => tag[0] === "p").map(tag => tag[1])
  ) || [];

  // Remove duplicates
  const uniqueDeclinedUsers = [...new Set(declinedUsers)];

  // Filter out join requests from users who are already approved, declined, or banned
  const pendingRequests = joinRequests?.filter(request => 
    !uniqueApprovedMembers.includes(request.pubkey) && 
    !uniqueDeclinedUsers.includes(request.pubkey) &&
    !uniqueBannedUsers.includes(request.pubkey)
  ) || [];

  const handleApproveUser = async (pubkey: string) => {
    if (!user || !isModerator) {
      toast.error("You must be a moderator to approve members");
      return;
    }

    try {
      // Check if the user is in the declined list
      const isDeclined = uniqueDeclinedUsers.includes(pubkey);
      
      // Create a new list or update the existing one for approved members
      const tags = [
        ["a", communityId],
        ...uniqueApprovedMembers.map(pk => ["p", pk]),
        ["p", pubkey] // Add the new member
      ];

      // Create approved members event (kind 14550)
      await publishEvent({
        kind: 14550,
        tags,
        content: "",
      });
      
      // If the user was in the declined list, remove them by creating a new kind 4551 event
      // that excludes this pubkey
      if (isDeclined) {
        // Find all declined events that include this pubkey
        const declinedEventsForUser = declinedUsersEvents?.filter(event => 
          event.tags.some(tag => tag[0] === "p" && tag[1] === pubkey)
        ) || [];
        
        // For each declined event, create a new event that removes this user
        for (const declinedEvent of declinedEventsForUser) {
          // Get the original request event ID and kind from the declined event
          const eventIdTag = declinedEvent.tags.find(tag => tag[0] === "e");
          const kindTag = declinedEvent.tags.find(tag => tag[0] === "k");
          
          if (eventIdTag && kindTag) {
            // Create a new declined event that doesn't include this pubkey
            // This effectively "removes" the user from the declined list
            await publishEvent({
              kind: 14551,
              tags: [
                ["a", communityId],
                ["e", eventIdTag[1]],
                // Deliberately omitting the pubkey tag to remove the user
                ["k", kindTag[1]]
              ],
              content: "", // Empty content to indicate removal
            });
          }
        }
      }
      
      toast.success("User approved successfully!");
      
      // Refetch data
      refetchRequests();
      refetchMembers();
      refetchDeclined();
      
      // Switch to members tab
      setActiveTab("members");
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user. Please try again.");
    }
  };

  const handleRemoveMember = async (pubkey: string) => {
    if (!user || !isModerator) {
      toast.error("You must be a moderator to remove members");
      return;
    }

    try {
      // Filter out the member to remove
      const updatedMembers = uniqueApprovedMembers.filter(pk => pk !== pubkey);
      
      // Create a new list with the member removed
      const tags = [
        ["a", communityId],
        ...updatedMembers.map(pk => ["p", pk])
      ];

      // Create updated approved members event (kind 14550)
      await publishEvent({
        kind: 14550,
        tags,
        content: "",
      });
      
      // Add the removed user to the declined list (kind 14551)
      // We'll create a generic event ID since we don't have a specific request event
      const removalEventId = `removal:${pubkey}:${Date.now()}`;
      
      await publishEvent({
        kind: 14551,
        tags: [
          ["a", communityId],
          ["e", removalEventId], // Using a generated event ID
          ["p", pubkey], // The pubkey of the removed user
          ["k", "14550"] // Indicating this was a removal from the approved list
        ],
        content: JSON.stringify({
          reason: "Removed from group by moderator",
          timestamp: Date.now()
        }),
      });
      
      toast.success("Member removed successfully!");
      
      // Refetch data
      refetchMembers();
      refetchDeclined();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member. Please try again.");
    }
  };
  
  const handleBanUser = async (pubkey: string) => {
    if (!user || !isModerator) {
      toast.error("You must be a moderator to ban users");
      return;
    }

    try {
      // First remove the user from approved members if they are in that list
      if (uniqueApprovedMembers.includes(pubkey)) {
        await handleRemoveMember(pubkey);
      }
      
      // Then ban the user
      await banUser(pubkey);
      
      toast.success("User banned successfully!");
      
      // Switch to banned tab
      setActiveTab("banned");
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user. Please try again.");
    }
  };

  const handleDeclineUser = async (request: NostrEvent) => {
    if (!user || !isModerator) {
      toast.error("You must be a moderator to decline join requests");
      return;
    }

    try {
      // Create decline event (kind 14551)
      await publishEvent({
        kind: 14551,
        tags: [
          ["a", communityId],
          ["e", request.id],
          ["p", request.pubkey],
          ["k", "4552"] // The kind of the request event
        ],
        content: JSON.stringify(request), // Store the full request event
      });
      
      toast.success("User declined successfully!");
      
      // Refetch data
      refetchRequests();
      refetchDeclined();
    } catch (error) {
      console.error("Error declining user:", error);
      toast.error("Failed to decline user. Please try again.");
    }
  };

  const handleApproveDeclinedUser = async (pubkey: string) => {
    if (!user || !isModerator) {
      toast.error("You must be a moderator to approve users");
      return;
    }

    try {
      // 1. Find all declined events that include this pubkey
      const declinedEventsForUser = declinedUsersEvents?.filter(event => 
        event.tags.some(tag => tag[0] === "p" && tag[1] === pubkey)
      ) || [];
      
      // 2. For each declined event, create a new event that removes this user
      for (const declinedEvent of declinedEventsForUser) {
        // Get the original request event ID and kind from the declined event
        const eventIdTag = declinedEvent.tags.find(tag => tag[0] === "e");
        const kindTag = declinedEvent.tags.find(tag => tag[0] === "k");
        
        if (eventIdTag && kindTag) {
          // Create a new declined event that doesn't include this pubkey
          // This effectively "removes" the user from the declined list
          await publishEvent({
            kind: 14551,
            tags: [
              ["a", communityId],
              ["e", eventIdTag[1]],
              // Deliberately omitting the pubkey tag to remove the user
              ["k", kindTag[1]]
            ],
            content: "", // Empty content to indicate removal
          });
        }
      }

      // 3. Add to approved members list
      const tags = [
        ["a", communityId],
        ...uniqueApprovedMembers.map(pk => ["p", pk]),
        ["p", pubkey] // Add the new member
      ];

      // Create approved members event (kind 14550)
      await publishEvent({
        kind: 14550,
        tags,
        content: "",
      });
      
      toast.success("User approved successfully!");
      
      // Refetch data
      refetchDeclined();
      refetchMembers();
      
      // Switch to members tab
      setActiveTab("members");
    } catch (error) {
      console.error("Error approving declined user:", error);
      toast.error("Failed to approve user. Please try again.");
    }
  };

  if (!isModerator) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Members</CardTitle>
        <CardDescription>
          Review join requests and manage approved members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="requests" className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Requests
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Members
              <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {uniqueApprovedMembers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="declined" className="flex items-center">
              <UserX className="h-4 w-4 mr-2" />
              Declined
              {uniqueDeclinedUsers.length > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                  {uniqueDeclinedUsers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="banned" className="flex items-center">
              <Ban className="h-4 w-4 mr-2" />
              Banned
              {uniqueBannedUsers.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs">
                  {uniqueBannedUsers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="requests">
            {isLoadingRequests ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No pending join requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <JoinRequestItem 
                    key={request.id} 
                    request={request} 
                    onApprove={() => handleApproveUser(request.pubkey)}
                    onDecline={() => handleDeclineUser(request)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="members">
            {isLoadingMembers ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                ))}
              </div>
            ) : uniqueApprovedMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No approved members yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uniqueApprovedMembers.map((pubkey) => (
                  <MemberItem 
                    key={pubkey} 
                    pubkey={pubkey} 
                    onRemove={() => handleRemoveMember(pubkey)}
                    onBan={() => handleBanUser(pubkey)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="declined">
            {isLoadingDeclined ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                ))}
              </div>
            ) : uniqueDeclinedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No declined users</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uniqueDeclinedUsers.map((pubkey) => (
                  <DeclinedUserItem 
                    key={pubkey} 
                    pubkey={pubkey} 
                    onApprove={() => handleApproveDeclinedUser(pubkey)} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="banned">
            {isLoadingBanned ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                ))}
              </div>
            ) : uniqueBannedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No banned users</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uniqueBannedUsers.map((pubkey) => (
                  <MemberItem 
                    key={pubkey} 
                    pubkey={pubkey} 
                    onRemove={() => unbanUser(pubkey)}
                    isBanned={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface JoinRequestItemProps {
  request: NostrEvent;
  onApprove: () => void;
  onDecline?: () => void;
}

function JoinRequestItem({ request, onApprove, onDecline }: JoinRequestItemProps) {
  const author = useAuthor(request.pubkey);
  const metadata = author.data?.metadata;
  
  const displayName = metadata?.name || request.pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  const joinReason = request.content;
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md gap-3">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${request.pubkey}`}>
          <Avatar>
            <AvatarImage src={profileImage} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link to={`/profile/${request.pubkey}`} className="font-medium hover:underline">
            {displayName}
          </Link>
          <p className="text-xs text-muted-foreground">
            Requested {new Date(request.created_at * 1000).toLocaleString()}
          </p>
          {joinReason && (
            <p className="text-sm mt-1 max-w-md">
              "{joinReason}"
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 ml-auto">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600"
          onClick={onDecline}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Decline
        </Button>
        <Button size="sm" onClick={onApprove}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
      </div>
    </div>
  );
}

interface MemberItemProps {
  pubkey: string;
  onRemove: () => void;
  onBan?: () => void;
  isBanned?: boolean;
}

function MemberItem({ pubkey, onRemove, onBan, isBanned = false }: MemberItemProps) {
  const author = useAuthor(pubkey);
  const { user } = useCurrentUser();
  const metadata = author.data?.metadata;
  
  const displayName = metadata?.name || pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  const isCurrentUser = user?.pubkey === pubkey;
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${pubkey}`}>
          <Avatar>
            <AvatarImage src={profileImage} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link to={`/profile/${pubkey}`} className="font-medium hover:underline">
            {displayName}
          </Link>
          {isCurrentUser && (
            <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              You
            </span>
          )}
          {isBanned && (
            <span className="ml-2 text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">
              Banned
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {onBan && !isBanned && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600"
            onClick={onBan}
            disabled={isCurrentUser}
          >
            <Ban className="h-4 w-4 mr-1" />
            Ban
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600"
          onClick={onRemove}
          disabled={isCurrentUser}
        >
          <XCircle className="h-4 w-4 mr-1" />
          {isBanned ? "Unban" : "Remove"}
        </Button>
      </div>
    </div>
  );
}

interface DeclinedUserItemProps {
  pubkey: string;
  onApprove: () => void;
}

function DeclinedUserItem({ pubkey, onApprove }: DeclinedUserItemProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  
  const displayName = metadata?.name || pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center gap-3">
        <Link to={`/profile/${pubkey}`}>
          <Avatar>
            <AvatarImage src={profileImage} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link to={`/profile/${pubkey}`} className="font-medium hover:underline">
            {displayName}
          </Link>
          <span className="ml-2 text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">
            Declined
          </span>
        </div>
      </div>
      <Button 
        size="sm"
        onClick={onApprove}
      >
        <CheckCircle className="h-4 w-4 mr-1" />
        Approve
      </Button>
    </div>
  );
}