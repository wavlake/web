import React from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";

interface LinkedPubkey {
  pubkey: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
    about?: string;
  };
}

interface ProfileSelectionStepProps {
  linkedPubkeys: LinkedPubkey[];
  onSelectPubkey: (pubkey: string) => void;
  onUseDifferent: () => void;
  onCreateNew: () => void;
  onBack: () => void;
}

export const ProfileSelectionStep: React.FC<ProfileSelectionStepProps> = ({
  linkedPubkeys,
  onSelectPubkey,
  onUseDifferent,
  onCreateNew,
  onBack
}) => {
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Choose Your Account</DialogTitle>
        <DialogDescription>
          We found {linkedPubkeys.length} Nostr account(s) linked to your email
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-3">
        {linkedPubkeys.map((account) => (
          <div
            key={account.pubkey}
            className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSelectPubkey(account.pubkey)}
          >
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={account.profile?.picture} />
                <AvatarFallback>
                  {account.profile?.name?.[0] || 
                   account.profile?.display_name?.[0] || 
                   account.pubkey.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="font-medium">
                  {account.profile?.name || 
                   account.profile?.display_name || 
                   'Unnamed Account'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {account.pubkey.slice(0, 8)}...{account.pubkey.slice(-8)}
                </p>
                {account.profile?.about && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {account.profile.about}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col space-y-2">
        <Button onClick={onUseDifferent} variant="outline">
          Use Different Nostr Account
        </Button>
        <Button onClick={onCreateNew} variant="outline">
          Generate New Account
        </Button>
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
      </div>
    </DialogContent>
  );
};

export default ProfileSelectionStep;