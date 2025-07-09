import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string) {
      
      try {
        const login = NLogin.fromNsec(nsec);
        
        addLogin(login);
        
        return login;
      } catch (error) {
        console.error('[useLoginActions] Failed to create login from nsec', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string) {
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
      return login;
    },
    // Login with a NIP-07 browser extension
    async extension() {
      const login = await NLogin.fromExtension();
      addLogin(login);
      return login;
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
