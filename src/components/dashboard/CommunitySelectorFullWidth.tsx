import { CommunitySelector } from "./CommunitySelector";

// Full width version for headers or wide layouts
export function CommunitySelectorFullWidth({
  className = "",
}: {
  className?: string;
}) {
  return <CommunitySelector showFullWidth={true} className={className} />;
}