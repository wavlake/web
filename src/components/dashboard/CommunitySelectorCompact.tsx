import { CommunitySelector } from "./CommunitySelector";

// Compact version for mobile or constrained spaces
export function CommunitySelectorCompact({
  className = "",
}: {
  className?: string;
}) {
  return <CommunitySelector showFullWidth={false} className={className} />;
}