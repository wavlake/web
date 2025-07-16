import { useCreateNostrAccount } from "../../hooks/auth/useCreateNostrAccount";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useLinkAccount } from "@/hooks/auth/useLinkAccount";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EditProfileForm } from "@/components/EditProfileForm";
import { useLegacyArtists } from "@/hooks/useLegacyApi";
import { useEffect } from "react";

interface AccountGenerationProps {
  onComplete: () => void;
}

export function AccountGeneration({ onComplete }: AccountGenerationProps) {
  const { isCreating, createAccount } = useCreateNostrAccount();
  const { user: firebaseUser } = useFirebaseAuth();
  const linkAccountMutation = useLinkAccount();
  const { user: currentUser } = useCurrentUser();
  const { data: legacyArtists } = useLegacyArtists();
  const artistName = legacyArtists?.[0]?.name;

  useEffect(() => {
    if (firebaseUser) {
      createAccount();
    }
  }, []);

  const handleProfileComplete = async () => {
    if (currentUser) {
      await linkAccountMutation.mutateAsync();
    }
    onComplete();
  };

  if (isCreating) {
    return <div>loading...</div>;
  }

  return (
    <EditProfileForm
      onComplete={handleProfileComplete}
      initialName={artistName}
    />
  );
}
