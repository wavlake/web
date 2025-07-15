import { useState } from "react";
import { Button } from "@/components/ui/button";

import { NostrAuthForm } from "./NostrAuthForm";
import { FirebaseAuthForm } from "./FirebaseAuthForm";
import { GenericStep } from "./GenericStep";
import useAppSettings from "@/hooks/useAppSettings";
import { useLegacyArtists } from "@/hooks/useLegacyApi";
import { useLinkedPubkeys } from "@/hooks/useLinkedPubkeys";

type SIGN_IN_STEP = "nostr" | "legacy" | "nostr-legacy" | "welcome";

export function SignIn({ handleBack }: { handleBack: () => void }) {
  const [STATE, SET_STATE] = useState<SIGN_IN_STEP>("nostr");
  const {
    settings,
    updateSettings,
    isLoading: isLoadingSettings,
  } = useAppSettings();
  const { data: legacyArtists, isLoading: isLoadingLegacyArtists } =
    useLegacyArtists();
  const artistsList = legacyArtists?.artists ?? [];
  const { primaryPubkey } = useLinkedPubkeys();

  switch (STATE) {
    case "nostr":
      return (
        <GenericStep
          handleBack={handleBack}
          title="Sign In"
          description="Sign in to Wavlake"
        >
          {/* {expectedPubkey && (
            <NostrAvatar pubkey={expectedPubkey || ""} size={64} includeName />
          )} */}
          <NostrAuthForm
            onComplete={() => {
              SET_STATE("welcome");
            }}
          />
          <Button
            className="w-full rounded-full py-6"
            onClick={() => SET_STATE("legacy")}
          >
            Migrate Legacy Wavlake Account
          </Button>
        </GenericStep>
      );

    case "legacy":
      return (
        <GenericStep
          handleBack={() => SET_STATE("nostr")}
          title="Sign In"
          description="Sign in to Wavlake"
        >
          <FirebaseAuthForm
            mode="signin"
            onComplete={() => {
              SET_STATE("nostr-legacy");
            }}
          />
        </GenericStep>
      );
    case "nostr-legacy":
      if (isLoadingLegacyArtists) {
        return <>Loading legacy artists...</>;
      }
      const isArtist = artistsList.length > 0;

      return (
        <GenericStep
          handleBack={() => SET_STATE("legacy")}
          title="Nostr Setup"
          description="Lets create a new Nostr identity for you"
        >
          <NostrAuthForm
            expectedPubkey={primaryPubkey?.pubkey}
            onComplete={() => {
              SET_STATE("welcome");
            }}
          />
          <div>
            TODO check pubkey links if one exists, prompt use to sign in with
            it. Allow user to bypass and login with another nostr account, or
            create a brand new one. If no pubkey links exist, prompt user to
            create a new Nostr account, or sign in with an existing one, and
            then link their legacy account. When done, redirect to the welcome
            page if they dont have a NIP-78 settings event.
          </div>
        </GenericStep>
      );

    case "welcome":
      if (isLoadingSettings) {
        return <>Loading settings...</>;
      }
      return (
        <GenericStep
          title="Welcome to Wavlake!"
          description={
            settings?.isArtist
              ? "You're all set up as an artist. Start creating and sharing your music!"
              : "You're all set up! Explore artist pages and discover new music."
          }
        >
          <Button
            className="w-full rounded-full py-6"
            onClick={() => {
              if (settings?.isArtist) {
                updateSettings({ isArtist: true }); // Ensure artist mode is set
                SET_STATE("welcome");
              } else {
                updateSettings({ isArtist: false }); // Ensure listener mode is set
                SET_STATE("welcome");
              }
            }}
          >
            {settings?.isArtist
              ? "Create your artist page"
              : "Explore artist pages"}
          </Button>
        </GenericStep>
      );
    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", STATE);
      return <div>An unexpected error occurred. Please try again.</div>;
  }
}
