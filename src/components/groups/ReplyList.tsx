import { useState } from "react";
import { NostrEvent } from "@nostrify/nostrify";
import { useReplies, useNestedReplies } from "@/hooks/useReplies";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteContent } from "../NoteContent";
import { ReplyForm } from "./ReplyForm";
import { Link } from "react-router-dom";
import { MessageSquare, Heart } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { toast } from "sonner";

interface ReplyListProps {
  postId: string;
  communityId: string;
  postAuthorPubkey: string;
}

export function ReplyList({ postId, communityId, postAuthorPubkey }: ReplyListProps) {
  const { data: replies, isLoading, refetch } = useReplies(postId, communityId);
  
  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="text-sm font-medium text-muted-foreground mb-2">Loading replies...</div>
        {[1, 2].map((i) => (
          <div key={i} className="pl-6 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }
  
  if (!replies || replies.length === 0) {
    return (
      <div className="mt-4">
        <div className="text-sm font-medium text-muted-foreground mb-4">No replies yet</div>
        <ReplyForm 
          postId={postId} 
          communityId={communityId} 
          postAuthorPubkey={postAuthorPubkey}
          onReplySubmitted={() => refetch()}
        />
      </div>
    );
  }
  
  return (
    <div className="mt-4 space-y-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
      </div>
      
      {replies.map((reply) => (
        <ReplyItem 
          key={reply.id} 
          reply={reply} 
          communityId={communityId}
          postId={postId}
          postAuthorPubkey={postAuthorPubkey}
          onReplySubmitted={() => refetch()}
        />
      ))}
      
      <div className="mt-4">
        <ReplyForm 
          postId={postId} 
          communityId={communityId} 
          postAuthorPubkey={postAuthorPubkey}
          onReplySubmitted={() => refetch()}
        />
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: NostrEvent;
  communityId: string;
  postId: string;
  postAuthorPubkey: string;
  onReplySubmitted: () => void;
}

function ReplyItem({ reply, communityId, postId, postAuthorPubkey, onReplySubmitted }: ReplyItemProps) {
  const author = useAuthor(reply.pubkey);
  const { user } = useCurrentUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { data: nestedReplies, isLoading: isLoadingNested, refetch: refetchNested } = useNestedReplies(reply.id);
  const [showNestedReplies, setShowNestedReplies] = useState(true);
  
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || reply.pubkey.slice(0, 8);
  const profileImage = metadata?.picture;
  
  const handleReplySubmitted = () => {
    setShowReplyForm(false);
    refetchNested();
    onReplySubmitted();
  };
  
  return (
    <div className="pl-6 border-l-2 border-muted">
      <div className="pt-2">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${reply.pubkey}`}>
            <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={profileImage} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <Link to={`/profile/${reply.pubkey}`} className="hover:underline">
                  <p className="font-semibold text-sm">{displayName}</p>
                </Link>
                <span className="text-xs text-muted-foreground">
                  {new Date(reply.created_at * 1000).toLocaleString()}
                </span>
              </div>
              
              <div className="text-sm">
                <NoteContent event={reply} />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1 ml-1">
              <LikeButton postId={reply.id} />
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Reply
              </Button>
              
              {nestedReplies && nestedReplies.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-6 px-2"
                  onClick={() => setShowNestedReplies(!showNestedReplies)}
                >
                  {showNestedReplies ? 'Hide replies' : `Show ${nestedReplies.length} replies`}
                </Button>
              )}
            </div>
            
            {showReplyForm && (
              <div className="mt-2">
                <ReplyForm 
                  postId={postId}
                  communityId={communityId}
                  postAuthorPubkey={postAuthorPubkey}
                  parentId={reply.id}
                  parentAuthorPubkey={reply.pubkey}
                  onReplySubmitted={handleReplySubmitted}
                  isNested={true}
                />
              </div>
            )}
            
            {showNestedReplies && nestedReplies && nestedReplies.length > 0 && (
              <div className="mt-3 space-y-3">
                {nestedReplies.map(nestedReply => (
                  <ReplyItem
                    key={nestedReply.id}
                    reply={nestedReply}
                    communityId={communityId}
                    postId={postId}
                    postAuthorPubkey={postAuthorPubkey}
                    onReplySubmitted={refetchNested}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LikeButtonProps {
  postId: string;
}

function LikeButton({ postId }: LikeButtonProps) {
  const { likeCount, hasLiked, toggleLike, isLoading } = useLikes(postId);
  const { user } = useCurrentUser();
  
  const handleClick = async () => {
    if (!user) {
      toast.error("You must be logged in to like posts");
      return;
    }
    
    await toggleLike();
  };
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className={`${hasLiked ? 'text-pink-500' : 'text-muted-foreground'} flex items-center h-6 px-2 text-xs`}
      onClick={handleClick}
      disabled={isLoading || !user}
    >
      <Heart className={`h-3 w-3 mr-1 ${hasLiked ? 'fill-pink-500' : ''}`} />
      {likeCount > 0 ? likeCount : ''}
      Like
    </Button>
  );
}