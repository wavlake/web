import { useState } from "react";
import { Button } from "@/components/ui/button";

import { NostrAuthForm } from "./NostrAuthForm";
import { FirebaseAuthForm } from "./FirebaseAuthForm";
import { GenericStep } from "./GenericStep";

type SIGN_IN_STEP = "nostr" | "legacy" | "nostr-legacy" | "welcome";

export function SignIn({ handleBack }: { handleBack: () => void }) {
  const [STATE, SET_STATE] = useState<SIGN_IN_STEP>("nostr");

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
          <NostrAuthForm />
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
            onComplete={() => SET_STATE("nostr-legacy")}
          />
        </GenericStep>
      );
    case "nostr-legacy":
      return (
        <GenericStep
          handleBack={() => SET_STATE("legacy")}
          title=" Account"
          description="Link your legacy Wavlake account with your Nostr identity"
        >
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
    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", STATE);
      return <div>An unexpected error occurred. Please try again.</div>;
  }
}
