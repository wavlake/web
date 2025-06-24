import React, { useState, useRef, useCallback, useMemo } from "react";
import { useNostrLogin, NUser } from "@nostrify/react/login";
import { useNostr } from "@nostrify/react";
import { useCreateCashuWallet } from "@/hooks/useCreateCashuWallet";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCreateAccount } from "@/hooks/useCreateAccount";
import {
  initializeFirebasePublishing,
  isPublishingConfigured,
} from "@/lib/firebasePublishing";
import { useFirebaseLegacyAuth } from "./useFirebaseLegacyAuth";
import { LoginStep } from "./steps/LoginStep";
import { PubkeySelectionStep } from "./steps/PubkeySelectionStep";
import { NostrSetupStep } from "./steps/NostrSetupStep";
import { LinkingStep } from "./steps/LinkingStep";
import { CompleteStep } from "./steps/CompleteStep";
import type { FirebaseLegacyLoginProps, MigrationStep } from "./types";

export function FirebaseLegacyLogin({
  onBack,
  onComplete,
  onStepChange,
}: FirebaseLegacyLoginProps) {
  const [migrationState, setMigrationState] = useState<MigrationStep>({
    step: "login",
  });

  // Call onStepChange whenever the step changes
  React.useEffect(() => {
    onStepChange?.(migrationState.step);
  }, [migrationState.step, onStepChange]);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [nsec, setNsec] = useState("");
  const [bunkerUri, setBunkerUri] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pubkey selection state
  const [selectedPubkey, setSelectedPubkey] = useState<string>("");
  const [showNewKeyOption, setShowNewKeyOption] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Hooks for Nostr functionality
  const { nostr } = useNostr();
  const { addLogin } = useNostrLogin();
  const { mutateAsync: createCashuWallet } = useCreateCashuWallet();
  const { user: currentUser } = useCurrentUser();
  const { createAccount, isCreating: isCreatingNewAccount } = useCreateAccount();

  // Use the custom hook for Firebase auth logic
  const {
    isLoading,
    error,
    setError,
    handleError,
    linkPubkey,
    getLinkedPubkeys,
    createAuthHandler,
    handleExtensionLogin,
    handleNsecLogin,
    handleBunkerLogin,
  } = useFirebaseLegacyAuth();

  // Import Firebase auth functions dynamically
  const signInWithEmailAndPassword = useMemo(() => {
    if (!isPublishingConfigured()) return null;

    return import("firebase/auth").then(
      (auth) => auth.signInWithEmailAndPassword
    );
  }, []);

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signInWithEmailAndPassword) {
      setError("Firebase authentication is not configured");
      return;
    }

    try {
      const { auth } = initializeFirebasePublishing();
      const signIn = await signInWithEmailAndPassword;
      const userCredential = await signIn(
        auth,
        formData.email,
        formData.password
      );
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Store token for later use
      sessionStorage.setItem("firebaseToken", firebaseToken);

      // Check if this user has linked pubkeys
      const data = await getLinkedPubkeys(firebaseToken);

      if (data.success && data.linked_pubkeys && data.linked_pubkeys.length > 0) {
        setMigrationState({
          step: "pubkey-selection",
          data: { firebaseToken, linkedPubkeys: data.linked_pubkeys },
        });
      } else {
        setMigrationState({
          step: "nostr-setup",
          data: { firebaseToken },
        });
      }
    } catch (error: any) {
      handleError(error, "Login failed. Please try again.");
    }
  };

  const handleCreateNostrAccount = async () => {
    setError(null);
    setMigrationState((prev) => ({ ...prev, step: "linking" }));

    try {
      const result = await createAccount({
        generateName: false,
        createWallet: true,
        onComplete: async ({ login, pubkey }) => {
          // Convert login to user to access signer
          let user: NUser;
          switch (login.type) {
            case "nsec": {
              user = NUser.fromNsecLogin(login);
              break;
            }
            case "bunker": {
              user = NUser.fromBunkerLogin(login, nostr);
              break;
            }
            case "extension": {
              user = NUser.fromExtensionLogin(login);
              break;
            }
            default:
              throw new Error(`Unsupported login type: ${login.type}`);
          }

          // Create signer function for linking
          const signerFunction = async (event: any) => {
            return await user.signer.signEvent(event);
          };

          try {
            await linkPubkey(pubkey, { signEvent: signerFunction });

            setMigrationState({
              step: "complete",
              data: {
                ...(migrationState.data || {}),
                selectedPubkey: pubkey,
              },
            });
          } catch (linkError: any) {
            handleError(linkError, "Failed to link Nostr account to Firebase");
            setMigrationState((prev) => ({ ...prev, step: "nostr-setup" }));
          }
        },
      });
    } catch (error: any) {
      handleError(error, "Failed to create Nostr account");
      setMigrationState((prev) => ({ ...prev, step: "nostr-setup" }));
    }
  };

  // Auth handlers for existing pubkeys
  const handleAuthenticateWithExtension = useCallback(async () => {
    setError(null);
    try {
      const { login, pubkey } = await handleExtensionLogin();
      if (pubkey !== selectedPubkey) {
        throw new Error("Extension pubkey doesn't match the selected identity");
      }
      addLogin(login);
      setMigrationState({
        step: "complete",
        data: {
          ...(migrationState.data || {}),
          selectedPubkey: pubkey,
        },
      });
    } catch (error: any) {
      handleError(error, "Authentication failed");
    }
  }, [selectedPubkey, handleExtensionLogin, addLogin, migrationState.data, handleError]);

  const handleAuthenticateWithNsec = useCallback(async () => {
    setError(null);
    try {
      const { login, pubkey } = await handleNsecLogin(nsec);
      if (pubkey !== selectedPubkey) {
        throw new Error("Nsec pubkey doesn't match the selected identity");
      }
      addLogin(login);
      setMigrationState({
        step: "complete",
        data: {
          ...(migrationState.data || {}),
          selectedPubkey: pubkey,
        },
      });
    } catch (error: any) {
      handleError(error, "Authentication failed");
    }
  }, [nsec, selectedPubkey, handleNsecLogin, addLogin, migrationState.data, handleError]);

  const handleAuthenticateWithBunker = useCallback(async () => {
    setError(null);
    try {
      const { login, pubkey } = await handleBunkerLogin(bunkerUri);
      const { linkedPubkeys = [] } = migrationState.data || {};
      const isForExistingPubkey = selectedPubkey && linkedPubkeys.find((p: any) => p.pubkey === selectedPubkey);
      
      if (isForExistingPubkey && pubkey !== selectedPubkey) {
        throw new Error("Bunker pubkey doesn't match the selected identity");
      }
      
      addLogin(login);
      setMigrationState({
        step: "complete",
        data: {
          ...(migrationState.data || {}),
          selectedPubkey: pubkey,
        },
      });
    } catch (error: any) {
      handleError(error, "Authentication failed");
    }
  }, [bunkerUri, selectedPubkey, handleBunkerLogin, addLogin, migrationState.data, handleError]);

  // Render the appropriate step
  switch (migrationState.step) {
    case "login":
      return (
        <LoginStep
          formData={formData}
          setFormData={setFormData}
          error={error}
          isLoading={isLoading}
          onSubmit={handleFirebaseLogin}
          onBack={onBack}
        />
      );

    case "pubkey-selection":
      return (
        <PubkeySelectionStep
          migrationState={migrationState}
          selectedPubkey={selectedPubkey}
          setSelectedPubkey={setSelectedPubkey}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          showNewKeyOption={showNewKeyOption}
          setShowNewKeyOption={setShowNewKeyOption}
          nsec={nsec}
          setNsec={setNsec}
          bunkerUri={bunkerUri}
          setBunkerUri={setBunkerUri}
          isLoading={isLoading}
          onBack={() => setMigrationState({ step: "login" })}
          onAuthenticateWithExtension={handleAuthenticateWithExtension}
          onAuthenticateWithNsec={handleAuthenticateWithNsec}
          onBunkerLogin={handleAuthenticateWithBunker}
          onCreateNostrAccount={handleCreateNostrAccount}
        />
      );

    case "nostr-setup":
      return (
        <NostrSetupStep
          nsec={nsec}
          setNsec={setNsec}
          bunkerUri={bunkerUri}
          setBunkerUri={setBunkerUri}
          isLoading={isLoading || isCreatingNewAccount}
          onBack={() => setMigrationState({ step: "login" })}
          onCreateNostrAccount={handleCreateNostrAccount}
          onExtensionLogin={useCallback(async () => {
            try {
              const { login, pubkey } = await handleExtensionLogin();
              addLogin(login);
              setMigrationState({
                step: "complete",
                data: {
                  ...(migrationState.data || {}),
                  selectedPubkey: pubkey,
                },
              });
            } catch (error: any) {
              handleError(error, "Failed to link extension");
            }
          }, [handleExtensionLogin, addLogin, migrationState.data, handleError])}
          onNsecLogin={useCallback(async () => {
            try {
              const { login, pubkey } = await handleNsecLogin(nsec);
              addLogin(login);
              setMigrationState({
                step: "complete",
                data: {
                  ...(migrationState.data || {}),
                  selectedPubkey: pubkey,
                },
              });
            } catch (error: any) {
              handleError(error, "Failed to link nsec");
            }
          }, [nsec, handleNsecLogin, addLogin, migrationState.data, handleError])}
          onBunkerLogin={useCallback(async () => {
            try {
              const { login, pubkey } = await handleBunkerLogin(bunkerUri);
              addLogin(login);
              setMigrationState({
                step: "complete",
                data: {
                  ...(migrationState.data || {}),
                  selectedPubkey: pubkey,
                },
              });
            } catch (error: any) {
              handleError(error, "Failed to link bunker");
            }
          }, [bunkerUri, handleBunkerLogin, addLogin, migrationState.data, handleError])}
        />
      );

    case "linking":
      return <LinkingStep />;

    case "complete":
      return (
        <CompleteStep
          migrationState={migrationState}
          onComplete={onComplete}
        />
      );
  }
}