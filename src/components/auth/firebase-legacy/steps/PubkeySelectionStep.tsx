import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Sparkles } from "lucide-react";
import { StepHeader } from "../StepHeader";
import { PubkeyCard } from "../PubkeyCard";
import { AuthMethodTabs } from "../AuthMethodTabs";
import type { LinkedPubkey, MigrationStep } from "../types";

interface PubkeySelectionStepProps {
  migrationState: MigrationStep;
  selectedPubkey: string;
  setSelectedPubkey: (pubkey: string) => void;
  searchFilter: string;
  setSearchFilter: (filter: string) => void;
  showNewKeyOption: boolean;
  setShowNewKeyOption: (show: boolean) => void;
  nsec: string;
  setNsec: (nsec: string) => void;
  bunkerUri: string;
  setBunkerUri: (uri: string) => void;
  isLoading: boolean;
  onBack: () => void;
  onAuthenticateWithExtension: () => void;
  onAuthenticateWithNsec: () => void;
  onBunkerLogin: () => void;
  onCreateNostrAccount: () => void;
}

export function PubkeySelectionStep({
  migrationState,
  selectedPubkey,
  setSelectedPubkey,
  searchFilter,
  setSearchFilter,
  showNewKeyOption,
  setShowNewKeyOption,
  nsec,
  setNsec,
  bunkerUri,
  setBunkerUri,
  isLoading,
  onBack,
  onAuthenticateWithExtension,
  onAuthenticateWithNsec,
  onBunkerLogin,
  onCreateNostrAccount,
}: PubkeySelectionStepProps) {
  const { linkedPubkeys = [] } = migrationState.data || {};
  const filteredPubkeys = linkedPubkeys.filter((pubkey: LinkedPubkey) => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return pubkey.pubkey.toLowerCase().includes(searchLower);
  });

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <Card className="w-full h-full flex flex-col border-0 shadow-none rounded-none">
        <StepHeader
          onBack={onBack}
          title="Choose Your Nostr Identity"
          description="Select an existing identity or create/link a new one"
        />

        <CardContent className="flex-1 flex flex-col space-y-6 min-h-0 px-6 pb-6">
          {/* Option 1: Use existing linked identity */}
          {linkedPubkeys.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-700">
                  Use Existing Identity
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose one of your {linkedPubkeys.length} linked identit
                {linkedPubkeys.length === 1 ? "y" : "ies"}
              </p>

              {linkedPubkeys.length > 10 && (
                <div className="mb-3">
                  <Input
                    placeholder="Search identities by name or pubkey..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 border rounded-lg p-3 bg-green-50">
                {filteredPubkeys.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredPubkeys.map((pubkey: LinkedPubkey) => (
                      <PubkeyCard
                        key={pubkey.pubkey}
                        pubkey={pubkey}
                        isSelected={selectedPubkey === pubkey.pubkey}
                        onClick={() => setSelectedPubkey(pubkey.pubkey)}
                      />
                    ))}
                  </div>
                ) : linkedPubkeys.length > 0 ? (
                  <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <div className="text-center">
                      <p className="text-sm">No identities match your search</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchFilter("")}
                        className="mt-1"
                      >
                        Clear search
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedPubkey && (
                <div className="space-y-4 pt-4 border-t border-green-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-green-700">
                      How do you want to sign in?
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-green-700 border-green-300"
                    >
                      Selected:{" "}
                      {selectedPubkey
                        ? `${selectedPubkey.slice(
                            0,
                            8
                          )}...${selectedPubkey.slice(-8)}`
                        : ""}
                    </Badge>
                  </div>

                  <AuthMethodTabs
                    onExtension={onAuthenticateWithExtension}
                    onNsec={onAuthenticateWithNsec}
                    onBunker={onBunkerLogin}
                    isForAuthentication={true}
                    isLoading={isLoading}
                    nsec={nsec}
                    setNsec={setNsec}
                    bunkerUri={bunkerUri}
                    setBunkerUri={setBunkerUri}
                  />
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {linkedPubkeys.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                OR
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Option 2: Use different identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">
                {linkedPubkeys.length > 0
                  ? "Use Different Identity"
                  : "Create or Link Identity"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {linkedPubkeys.length > 0
                ? "Link a different Nostr identity to your account"
                : "Create a new Nostr identity or link an existing one"}
            </p>

            {!showNewKeyOption ? (
              <Button
                onClick={() => setShowNewKeyOption(true)}
                variant="outline"
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {linkedPubkeys.length > 0
                  ? "Choose Different Identity"
                  : "Get Started"}
              </Button>
            ) : (
              <div className="space-y-4 border rounded-lg p-4 bg-background">
                <Button
                  onClick={onCreateNostrAccount}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={isLoading}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create New Nostr Identity (Recommended)
                </Button>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Or link an existing Nostr identity
                  </p>

                  <AuthMethodTabs
                    onExtension={onAuthenticateWithExtension}
                    onNsec={onAuthenticateWithNsec}
                    onBunker={onBunkerLogin}
                    isForAuthentication={false}
                    isLoading={isLoading}
                    nsec={nsec}
                    setNsec={setNsec}
                    bunkerUri={bunkerUri}
                    setBunkerUri={setBunkerUri}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
