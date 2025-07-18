import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuthor } from "@/hooks/useAuthor";
import { Tooltip } from "../ui/tooltip";
import { hexToNpub } from "./utils/formatters";

interface PubkeyMismatchAlertProps {
  expectedPubkey: string;
  enteredPubkey: string;
}

export function PubkeyMismatchAlert({
  expectedPubkey,
  enteredPubkey,
}: PubkeyMismatchAlertProps) {
  const expectedAuthor = useAuthor(expectedPubkey);
  const enteredAuthor = useAuthor(enteredPubkey);

  const expectedProfile = expectedAuthor.data?.metadata;
  const enteredProfile = enteredAuthor.data?.metadata;
  const npub = hexToNpub(expectedPubkey);

  const getDisplayName = (profile: unknown, pubkey: string) => {
    const p = profile as
      | { display_name?: string; name?: string }
      | null
      | undefined;
    return (
      p?.display_name || p?.name || `${npub.slice(0, 8)}...${npub.slice(-8)}`
    );
  };

  const getProfileImage = (profile: unknown) => {
    const p = profile as { picture?: string } | null | undefined;
    return p?.picture;
  };

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <strong>Account Mismatch Detected</strong>
      </AlertDescription>
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getProfileImage(enteredProfile)} />
          <AvatarFallback>
            {getDisplayName(enteredProfile, enteredPubkey)
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-orange-900">
            {getDisplayName(enteredProfile, enteredPubkey)}
          </p>
          <p className="text-sm text-orange-700 font-mono">
            {npub.slice(0, 8)}...{npub.slice(-8)}
          </p>
        </div>
      </div>
    </Alert>
  );
}
