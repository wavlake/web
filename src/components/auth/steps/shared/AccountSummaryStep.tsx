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
} from "lucide-react";
import { LinkedPubkey } from "@/hooks/auth/machines/types";

interface AccountSummaryStepProps {
  onContinue: () => void;
  // Nostr account info
  currentPubkey: string;
  displayName?: string;
  profilePicture?: string;
  // Linked accounts
  linkedPubkeys?: LinkedPubkey[];
  isLinked?: boolean;
  // Firebase info
  firebaseEmail?: string;
  hasFirebaseBackup?: boolean;
  // Flow context
  flowType: "signup" | "migration" | "login";
  isArtist?: boolean;
}

export function AccountSummaryStep({
  onContinue,
  currentPubkey,
  displayName,
  profilePicture,
  linkedPubkeys = [],
  isLinked = false,
  firebaseEmail,
  hasFirebaseBackup = false,
  flowType,
  isArtist = false,
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
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
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
        <Button onClick={onContinue} className="px-8 py-3 text-lg" size="lg">
          {flowType === "signup" ? "Get Started" : "Continue to Dashboard"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
