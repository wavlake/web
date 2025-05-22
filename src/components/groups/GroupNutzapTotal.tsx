import { useGroupNutzapTotal } from "@/hooks/useGroupNutzaps";
import { formatBalance } from "@/lib/cashu";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GroupNutzapTotalProps {
  groupId: string;
  className?: string;
}

export function GroupNutzapTotal({ groupId, className = "" }: GroupNutzapTotalProps) {
  const { total, isLoading } = useGroupNutzapTotal(groupId);

  if (isLoading) {
    return <Skeleton className={`h-6 w-24 ${className}`} />;
  }

  if (total === 0) {
    return null; // Don't show anything if there are no nutzaps
  }

  return (
    <div className={`flex items-center text-amber-500 ${className}`}>
      <Zap className="h-4 w-4 mr-1" />
      <span>{formatBalance(total)}</span>
    </div>
  );
}