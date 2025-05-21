import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useNip05Verification } from "@/hooks/useNip05Verification";

interface VerifiedNip05Props {
  nip05: string | undefined;
  pubkey: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Component to display a NIP-05 identifier with verification status
 */
export function VerifiedNip05({ nip05, pubkey, className, showIcon = true }: VerifiedNip05Props) {
  const { data, isLoading, isError } = useNip05Verification(nip05, pubkey);

  if (!nip05) {
    return null;
  }

  // Format the NIP-05 identifier for display
  const formattedNip05 = nip05;

  return (
    <span className={`flex items-center gap-1 text-sm ${className || ''}`}>
      {isLoading ? (
        <>
          {formattedNip05}
          <Skeleton className="h-4 w-4 rounded-full" />
        </>
      ) : data?.isVerified ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1">
              {formattedNip05}
              {showIcon && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </TooltipTrigger>
            <TooltipContent>
              <p>Verified NIP-05 identifier</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1">
              {formattedNip05}
              {showIcon && (isError ? (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              ))}
            </TooltipTrigger>
            <TooltipContent>
              <p>{data?.error || "Unverified NIP-05 identifier"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
}