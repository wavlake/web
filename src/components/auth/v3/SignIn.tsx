import { useNostrAuthentication } from "@/hooks/auth/useNostrAuthentication";
import { useFirebaseAuthentication } from "@/hooks/auth/useFirebaseAuthentication";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { FirebaseAuthForm } from "./FirebaseAuthForm";
import { NostrAuthForm } from "./NostrAuthForm";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SIGN_IN_STEP = "nostr" | "legacy";

export function SignIn({ handleBack }: { handleBack: () => void }) {
  const [STATE, SET_STATE] = useState<SIGN_IN_STEP>("nostr");
  const { user: currentUser } = useCurrentUser();

  // Business logic hooks
  const nostrAuth = useNostrAuthentication();
  const firebaseAuth = useFirebaseAuthentication();

  switch (STATE) {
    case "nostr":
      return (
        <div>
          nostr
          <Button onClick={handleBack}>Back</Button>
          <Button onClick={() => SET_STATE("legacy")}>
            Migrate Legacy Wavlake Account
          </Button>
        </div>
      );

    case "legacy":
      return (
        <div>
          legacy
          <Button onClick={handleBack}></Button>
        </div>
      );

    default:
      // This shouldn't happen with proper TypeScript, but handle gracefully
      console.error("Unknown auth flow state:", STATE);
      return <div>An unexpected error occurred. Please try again.</div>;
  }
}
