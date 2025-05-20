import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useNostr } from "@/hooks/useNostr";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthor } from "@/hooks/useAuthor";
import { toast } from "sonner";
import { ArrowLeft, Save, UserPlus, Users, Shield, Trash2 } from "lucide-react";
import { parseNostrAddress } from "@/lib/nostr-utils";
import { NostrEvent } from "@nostrify/nostrify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GroupSettings() {
  const { groupId } = useParams<{ groupId: string }>();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const navigate = useNavigate();
  const [parsedId, setParsedId] = useState<{ kind: number; pubkey: string; identifier: string } | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [moderators, setModerators] = useState<string[]>([]);
  const [isRemoveModDialogOpen, setIsRemoveModDialogOpen] = useState<string | null>(null);
  
  useEffect(() => {
    if (groupId) {
      const parsed = parseNostrAddress(decodeURIComponent(groupId));
      if (parsed) {
        setParsedId(parsed);
      }
    }
  }, [groupId]);
  
  // Query for community details
  const { data: community, isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["community-settings", parsedId?.pubkey, parsedId?.identifier],
    queryFn: async (c) => {
      if (!parsedId) throw new Error("Invalid community ID");
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{ 
        kinds: [34550], 
        authors: [parsedId.pubkey],
        "#d": [parsedId.identifier]
      }], { signal });
      
      if (events.length === 0) throw new Error("Community not found");
      return events[0];
    },
    enabled: !!nostr && !!parsedId,
    onSuccess: (data) => {
      // Initialize form with current values
      const nameTag = data.tags.find(tag => tag[0] === "name");
      const descriptionTag = data.tags.find(tag => tag[0] === "description");
      const imageTag = data.tags.find(tag => tag[0] === "image");
      const modTags = data.tags.filter(tag => tag[0] === "p" && tag[3] === "moderator");
      
      setName(nameTag ? nameTag[1] : "");
      setDescription(descriptionTag ? descriptionTag[1] : "");
      setImageUrl(imageTag ? imageTag[1] : "");
      setModerators(modTags.map(tag => tag[1]));
    }
  });
  
  // Query for approved members
  const { data: approvedMembersEvents, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["approved-members-settings", groupId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{ 
        kinds: [14550],
        "#a": [groupId || ""],
        limit: 50,
      }], { signal });
      
      return events;
    },
    enabled: !!nostr && !!groupId,
  });
  
  // Extract all approved member pubkeys from the events
  const approvedMembers = approvedMembersEvents?.flatMap(event => 
    event.tags.filter(tag => tag[0] === "p").map(tag => tag[1])
  ) || [];
  
  // Remove duplicates
  const uniqueApprovedMembers = [...new Set(approvedMembers)];
  
  // Check if user is a moderator
  const isModerator = user && moderators.includes(user.pubkey);
  
  // Check if user is the creator/owner (the signer of the original event)
  const isOwner = user && community && user.pubkey === community.pubkey;
  
  // Debug logging
  console.log("Current user pubkey:", user?.pubkey);
  console.log("Community creator pubkey:", community?.pubkey);
  console.log("Is owner:", isOwner);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to update community settings");
      return;
    }
    
    if (!parsedId) {
      toast.error("Invalid community ID");
      return;
    }
    
    // Only the owner can update moderators
    if (moderators.some(mod => !community.tags.some(tag => tag[0] === "p" && tag[1] === mod && tag[3] === "moderator")) && !isOwner) {
      toast.error("Only the group owner can add or remove moderators");
      return;
    }
    
    // Moderators can update general settings, but only the owner can update moderators
    if (!isModerator && !isOwner) {
      toast.error("You must be a moderator or the group owner to update community settings");
      return;
    }
    
    try {
      // Build tags array
      const tags = [
        ["d", parsedId.identifier],
        ["name", name],
        ["description", description],
      ];
      
      if (imageUrl) {
        tags.push(["image", imageUrl]);
      }
      
      // Add moderator tags
      moderators.forEach(mod => {
        tags.push(["p", mod, "", "moderator"]);
      });
      
      // Create community update event (kind 34550)
      await publishEvent({
        kind: 34550,
        tags,
        content: "",
      });
      
      toast.success("Community settings updated successfully!");
      
      // Navigate back to community page
      navigate(`/group/${encodeURIComponent(groupId || "")}`);
    } catch (error) {
      console.error("Error updating community settings:", error);
      toast.error("Failed to update community settings. Please try again.");
    }
  };
  
  const handleAddModerator = async (pubkey: string) => {
    // Only the owner can add moderators
    if (!isOwner) {
      toast.error("Only the group owner can add moderators");
      return;
    }
    
    if (!moderators.includes(pubkey)) {
      setModerators([...moderators, pubkey]);
      toast.success("Moderator added. Save changes to apply.");
    }
  };
  
  const handleRemoveModerator = (pubkey: string) => {
    // Only the owner can remove moderators
    if (!isOwner) {
      toast.error("Only the group owner can remove moderators");
      return;
    }
    
    // Don't allow removing the owner
    if (community && community.pubkey === pubkey) {
      toast.error("Cannot remove the group owner");
      return;
    }
    
    setModerators(moderators.filter(mod => mod !== pubkey));
    setIsRemoveModDialogOpen(null);
    toast.success("Moderator removed. Save changes to apply.");
  };
  
  if (isLoadingCommunity) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Loading community settings...</h1>
      </div>
    );
  }
  
  if (!community) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Community not found</h1>
        <p>The community you're looking for doesn't exist or has been deleted.</p>
        <Button asChild className="mt-4">
          <Link to="/groups">Back to Communities</Link>
        </Button>
      </div>
    );
  }
  
  if (!isModerator && !isOwner) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You must be a moderator or the group owner to access community settings.</p>
        <Button asChild className="mt-4">
          <Link to={`/group/${encodeURIComponent(groupId || "")}`}>Back to Community</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to={`/group/${encodeURIComponent(groupId || "")}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Community
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Community Settings</h1>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          {isOwner && (
            <TabsTrigger value="moderators">Moderators</TabsTrigger>
          )}
        </TabsList>
        
        <form onSubmit={handleSubmit}>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Update your community's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Community Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter community name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Enter community description"
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input 
                    id="image" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)} 
                    placeholder="Enter image URL"
                  />
                  
                  {imageUrl && (
                    <div className="mt-2 rounded-md overflow-hidden border w-full max-w-xs">
                      <img 
                        src={imageUrl} 
                        alt="Community preview" 
                        className="w-full h-auto"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/400x200?text=Invalid+Image";
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="ml-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="moderators">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Group Owner & Moderators
                  </CardTitle>
                  <CardDescription>
                    {isOwner 
                      ? "As the group owner, you can manage who can moderate this community"
                      : "Only the group owner can add or remove moderators"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {moderators.length === 0 ? (
                      <p className="text-muted-foreground">No moderators yet</p>
                    ) : (
                      moderators.map((pubkey) => (
                        <ModeratorItem 
                          key={pubkey} 
                          pubkey={pubkey} 
                          isCreator={community.pubkey === pubkey}
                          onRemove={() => setIsRemoveModDialogOpen(pubkey)}
                        />
                      ))
                    )}
                    
                    {/* If the owner is not in the moderators list, add them separately */}
                    {community && !moderators.includes(community.pubkey) && (
                      <ModeratorItem 
                        key={community.pubkey} 
                        pubkey={community.pubkey} 
                        isCreator={true}
                        onRemove={() => {}} // Owner can't be removed
                      />
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="ml-auto">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Community Members
                  </CardTitle>
                  <CardDescription>
                    {isOwner 
                      ? "As the group owner, you can promote members to moderators"
                      : "Only the group owner can promote members to moderators"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                      {uniqueApprovedMembers
                        .filter(pubkey => !moderators.includes(pubkey)) // Only show non-moderators
                        .map((pubkey) => (
                          <MemberItem 
                            key={pubkey} 
                            pubkey={pubkey} 
                            onPromote={() => handleAddModerator(pubkey)}
                            isOwner={isOwner}
                          />
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </form>
      </Tabs>
      
      <AlertDialog open={!!isRemoveModDialogOpen} onOpenChange={() => setIsRemoveModDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Moderator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this moderator? They will no longer be able to manage this community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => isRemoveModDialogOpen && handleRemoveModerator(isRemoveModDialogOpen)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Moderator
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ModeratorItemProps {
  pubkey: string;
  isCreator?: boolean;
  onRemove: () => void;
}

function ModeratorItem({ pubkey, isCreator = false, onRemove }: ModeratorItemProps) {
  const author = useAuthor(pubkey);
  const { user } = useCurrentUser();
  const metadata = author.data?.metadata;
  
  const displayName = metadata?.name || pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  const isCurrentUser = user?.pubkey === pubkey;
  const isOwner = isCreator; // This is passed from the parent component
  
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
          <div className="flex items-center gap-2">
            {isOwner ? (
              <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2 py-0.5">
                Group Owner
              </span>
            ) : (
              <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">
                Moderator
              </span>
            )}
            {isCurrentUser && (
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                You
              </span>
            )}
          </div>
        </div>
      </div>
      {!isOwner && user && (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600"
          onClick={onRemove}
          disabled={!isCurrentUser && !user.pubkey}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      )}
    </div>
  );
}

interface MemberItemProps {
  pubkey: string;
  onPromote: () => void;
  isOwner: boolean;
}

function MemberItem({ pubkey, onPromote, isOwner }: MemberItemProps) {
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
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onPromote}
        disabled={!isOwner}
        title={!isOwner ? "Only the group owner can add moderators" : ""}
      >
        <UserPlus className="h-4 w-4 mr-1" />
        Make Moderator
      </Button>
    </div>
  );
}