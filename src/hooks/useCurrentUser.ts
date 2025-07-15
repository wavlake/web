import { type NLoginType, NUser, useNostrLogin } from '@nostrify/react/login';
import { useNostr } from '@nostrify/react';
import { useCallback, useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';

import { useAuthor } from './useAuthor.ts';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';

export function useCurrentUser() {
  const { nostr } = useNostr();
  const { logins, removeLogin } = useNostrLogin();
  const { logout: logoutFirebase } = useFirebaseAuth();

  const loginToUser = useCallback((login: NLoginType): NUser  => {
    switch (login.type) {
      case 'nsec': // Nostr login with secret key
        return NUser.fromNsecLogin(login);
      case 'bunker': // Nostr login with NIP-46 "bunker://" URI
        return NUser.fromBunkerLogin(login, nostr);
      case 'extension': // Nostr login with NIP-07 browser extension
        return NUser.fromExtensionLogin(login);
      // Other login types can be defined here
      default:
        throw new Error(`Unsupported login type: ${login.type}`);
    }
  }, [nostr]);

  const users = useMemo(() => {
    const users: NUser[] = [];

    for (const login of logins) {
      try {
        const user = loginToUser(login);
        users.push(user);
      } catch (error) {
        console.warn('Skipped invalid login', login.id, error);
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
    if (user && logins[0]) {
      removeLogin(logins[0].id);
    }
    logoutFirebase();
  }, [user, logins, removeLogin, logoutFirebase]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  return {
    // Core user data
    user,
    users: user ? [user] : [],
    ...author.data,
    
    // Authentication state
    isAuthenticated,
    
    // Actions
    logout,
  };
}
