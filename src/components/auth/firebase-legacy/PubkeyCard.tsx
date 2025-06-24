import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { useAuthor } from "@/hooks/useAuthor";
import type { LinkedPubkey } from "./types";

interface PubkeyCardProps {
  pubkey: LinkedPubkey;
  isSelected: boolean;
  onClick: () => void;
}

export function PubkeyCard({ pubkey, isSelected, onClick }: PubkeyCardProps) {
  const { data: author } = useAuthor(pubkey.pubkey);
  const metadata = author?.metadata;

  return (
    <div
      className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={metadata?.picture} />
          <AvatarFallback className="text-xs">
            {metadata?.name?.slice(0, 2)?.toUpperCase() ||
              pubkey.pubkey.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate text-sm">
              {metadata?.display_name ||
                metadata?.name ||
                `User ${pubkey.pubkey.slice(0, 8)}...`}
            </p>
            {isSelected && (
              <Badge variant="default" className="text-xs py-0 px-1">
                ✓
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-1">
            {`${pubkey.pubkey.slice(0, 8)}...${pubkey.pubkey.slice(-8)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Last used{" "}
            {formatRelativeTime(
              Math.floor(new Date(pubkey.last_used_at).getTime() / 1000)
            )}
          </p>

          {metadata?.about && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-tight">
              {metadata.about}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}