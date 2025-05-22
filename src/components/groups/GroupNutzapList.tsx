import { useGroupNutzaps } from "@/hooks/useGroupNutzaps";
import { useAuthor } from "@/hooks/useAuthor";
import { formatBalance } from "@/lib/cashu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

interface GroupNutzapListProps {
  groupId: string;
}

export function GroupNutzapList({ groupId }: GroupNutzapListProps) {
  const { data: nutzaps, isLoading, error } = useGroupNutzaps(groupId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading nutzaps: {String(error)}</div>;
  }

  if (!nutzaps || nutzaps.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No eCash for this group yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {nutzaps.map((event) => (
        <NutzapItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function NutzapItem({ event }: { event: any }) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || event.pubkey.slice(0, 8);
  const profileImage = metadata?.picture;

  // Extract amount from proofs
  let totalAmount = 0;
  for (const tag of event.tags) {
    if (tag[0] === 'proof') {
      try {
        const proof = JSON.parse(tag[1]);
        totalAmount += proof.amount || 0;
      } catch (e) {
        console.error('Error parsing proof:', e);
      }
    }
  }

  // Format date
  const date = new Date(event.created_at * 1000);
  const formattedDate = date.toLocaleString();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Link to={`/profile/${event.pubkey}`} className="flex items-center gap-2 hover:underline">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">{formattedDate}</div>
            </div>
          </Link>
          <div className="flex items-center text-amber-500">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="font-medium">{formatBalance(totalAmount)}</span>
          </div>
        </div>
      </CardHeader>
      {event.content && (
        <CardContent>
          <p className="text-sm">{event.content}</p>
        </CardContent>
      )}
    </Card>
  );
}