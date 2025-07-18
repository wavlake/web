import {
  type NLoginType,
  NUser,
  useNostrLogin,
  NLogin,
} from "@nostrify/react/login";
import { useNostr } from "@nostrify/react";
import { useCallback, useMemo } from "react";

import { useAuthor } from "./useAuthor.ts";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

export function useCurrentUser() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();
  const { logout: logoutFirebase } = useFirebaseAuth();

  // TODO: Refactor loginToUser pattern into shared utility
  // Currently duplicated across 5+ auth files: useLegacyMigrationFlow, 
  // useLegacyMigrationStateMachine, useSignupUploadFile, SignupProfileForm
  // This logic should be extracted to reduce code duplication
  const loginToUser = useCallback(
    (login: NLoginType): NUser => {
      switch (login.type) {
        case "nsec": // Nostr login with secret key
          return NUser.fromNsecLogin(login);
        case "bunker": // Nostr login with NIP-46 "bunker://" URI
          return NUser.fromBunkerLogin(login, nostr);
        case "extension": // Nostr login with NIP-07 browser extension
          return NUser.fromExtensionLogin(login);
        // Other login types can be defined here
        default:
          throw new Error(`Unsupported login type: ${login.type}`);
      }
    },
    [nostr]
  );

  const users = useMemo(() => {
    const users: NUser[] = [];

    for (const login of logins) {
      try {
        const user = loginToUser(login);
        users.push(user);
      } catch (error) {
        console.warn("Skipped invalid login", login.id, error);
      }
    }

    return users;
  }, [logins, loginToUser]);

  // Use first login as current user (single-user mode)
  const user = users[0] as NUser | undefined;
  const author = useAuthor(user?.pubkey);

  /**
   * Logout current user from both Nostr and Firebase
   */
  const logout = useCallback(() => {
    console.log("[useCurrentUser] Logging out user", { user, logins });
    if (user && logins[0]) {
      removeLogin(logins[0].id);
    }
    logoutFirebase();
  }, [user, logins, removeLogin, logoutFirebase]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  /**
   * Login with a Nostr secret key
   */
  const loginWithNsec = useCallback(
    (nsec: string) => {
      try {
        console.log("[useCurrentUser] Creating login from nsec", { nsec });
        const login = NLogin.fromNsec(nsec);
        addLogin(login);
        return login;
      } catch (error) {
        console.error("[useCurrentUser] Failed to create login from nsec", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
    [addLogin]
  );

  /**
   * Login with a NIP-46 "bunker://" URI
   */
  const loginWithBunker = useCallback(
    async (uri: string) => {
      console.log("[useCurrentUser] Creating login from bunker URI", { uri });
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
      return login;
    },
    [addLogin, nostr]
  );

  /**
   * Login with a NIP-07 browser extension
   */
  const loginWithExtension = useCallback(async () => {
    console.log("[useCurrentUser] Creating login from browser extension");
    const login = await NLogin.fromExtension();
    addLogin(login);
    return login;
  }, [addLogin]);

  // Enhanced addLogin that returns the created user
  const addLoginWithUser = useCallback(
    (login: NLoginType) => {
      console.log("[useCurrentUser] Adding login", {
        id: login.id,
        type: login.type,
        pubkey: login.pubkey,
      });
      addLogin(login);
      return loginToUser(login);
    },
    [addLogin, loginToUser]
  );

  return {
    // Core user data
    user,
    users: user ? [user] : [],
    ...author.data,

    // Authentication state
    isAuthenticated,

    // Actions
    logout,
    addLogin: addLoginWithUser,

    // Login methods
    loginWithNsec,
    loginWithBunker,
    loginWithExtension,
  };
}
