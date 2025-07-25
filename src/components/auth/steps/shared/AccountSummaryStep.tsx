/**
 * Account Summary Step Component
 *
 * Shows a comprehensive summary of the user's account setup including
 * linked accounts, profile information, and next steps.
 */
import { nip19 } from "nostr-tools";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CheckCircle,
  Mail,
  Key,
  Link as LinkIcon,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";
import { LinkedPubkey } from "@/hooks/auth/machines/types";
import { NostrAvatar } from "@/components/NostrAvatar";

interface AccountSummaryStepProps {
  onContinue: () => void;
  // Nostr account info
  currentPubkey: string;
  displayName?: string; // Keep for custom names from signup/migration flows
  // Linked accounts
  linkedPubkeys?: LinkedPubkey[];
  isLinked?: boolean;
  // Firebase info
  firebaseEmail?: string;
  hasFirebaseBackup?: boolean;
  // Flow context
  flowType: "signup" | "migration" | "login";
  isArtist?: boolean;
  // Loading state
  isLoading?: boolean;
}

export function AccountSummaryStep({
  onContinue,
  currentPubkey,
  displayName,
  linkedPubkeys = [],
  isLinked = false,
  firebaseEmail,
  hasFirebaseBackup = false,
  flowType,
  isArtist = false,
  isLoading = false,
}: AccountSummaryStepProps) {
  const formatPubkey = (pubkey: string) => {
    const npubKey = nip19.npubEncode(pubkey);
    return `${npubKey.slice(0, 10)}...${npubKey.slice(-4)}`;
  };

  const getFlowTitle = () => {
    switch (flowType) {
      case "signup":
        return "Welcome!";
      case "migration":
        return "Migration Complete!";
      case "login":
        return "Welcome Back!";
      default:
        return "Account Setup Complete!";
    }
  };

  const getFlowDescription = () => {
    switch (flowType) {
      case "signup":
        return isArtist
          ? "Your artist account has been set up."
          : "Your account has been set up.";
      case "migration":
        return "Your legacy account has been successfully migrated to the new system.";
      case "login":
        return "You are now signed in to your Wavlake account.";
      default:
        return "Your account configuration is complete.";
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            {getFlowTitle()}
          </CardTitle>
          <CardDescription className="text-green-700">
            {getFlowDescription()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Account Overview */}
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <NostrAvatar pubkey={currentPubkey} size={40} includeName={false} />
            <div>
              <div className="font-medium">{displayName || "New User"}</div>
              <code className="text-sm text-muted-foreground">
                {formatPubkey(currentPubkey)}
              </code>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button 
          onClick={onContinue} 
          className="px-8 py-3 text-lg" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up your account...
            </>
          ) : (
            <>
              {flowType === "signup" ? "Get Started" : "Continue to Dashboard"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
