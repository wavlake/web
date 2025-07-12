import { useState } from "react";
import { Button } from "@/components/ui/button";

import { NostrAuthForm } from "./NostrAuthForm";
import { FirebaseAuthForm } from "./FirebaseAuthForm";

type SIGN_IN_STEP = "nostr" | "legacy";

export function SignIn({ handleBack }: { handleBack: () => void }) {
  const [STATE, SET_STATE] = useState<SIGN_IN_STEP>("nostr");

  switch (STATE) {
    case "nostr":
      return (
        <div>
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
        </div>
      );

    case "legacy":
      return (
        <div>
          <FirebaseAuthForm />
          <Button
            className="w-full rounded-full py-6"
            onClick={() => SET_STATE("nostr")}
          >
            Sign in with Nostr keys
          </Button>
        </div>
      );

    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", STATE);
      return <div>An unexpected error occurred. Please try again.</div>;
  }
}
