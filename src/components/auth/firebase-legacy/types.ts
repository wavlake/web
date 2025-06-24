export interface MigrationStep {
  step: "login" | "pubkey-selection" | "nostr-setup" | "linking" | "complete";
  data?: {
    firebaseToken?: string;
    linkedPubkeys?: LinkedPubkey[];
    selectedPubkey?: string;
  };
}

export interface LinkedPubkey {
  pubkey: string;
  linked_at: string;
  last_used_at: string;
}

export interface LinkedPubkeysResponse {
  success: boolean;
  firebase_uid: string;
  linked_pubkeys: LinkedPubkey[];
}

export interface AuthMethod {
  type: "extension" | "nsec" | "bunker";
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface FirebaseLegacyLoginProps {
  onBack: () => void;
  onComplete: () => void;
  onStepChange?: (step: MigrationStep["step"]) => void;
}