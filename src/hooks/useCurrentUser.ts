import { type NLoginType, NUser, useNostrLogin } from '@nostrify/react/login';
import { useNostr } from '@nostrify/react';
import { useCallback, useMemo, useEffect, useState } from 'react';

import { useAuthor } from './useAuthor.ts';
import { useLoggedInAccounts } from './useLoggedInAccounts.ts';

export function useCurrentUser() {
  const { nostr } = useNostr();
  const { logins } = useNostrLogin();
  const { currentUser: loggedInAccount } = useLoggedInAccounts();
  
  // State for window.nostr fallback
  const [windowNostrUser, setWindowNostrUser] = useState<{
    pubkey: string;
    signer: any;
    method: 'extension';
  } | null>(null);
  
  // Check for window.nostr and get pubkey
  useEffect(() => {
    const checkWindowNostr = async () => {
      if (typeof window !== 'undefined') {
        // Wait a bit for extensions to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if ((window as any).nostr) {
          try {
            const pubkey = await (window as any).nostr.getPublicKey();
            console.log('Detected NIP-07 extension user:', pubkey);
            setWindowNostrUser({
              pubkey,
              signer: (window as any).nostr,
              method: 'extension' as const
            });
          } catch (error) {
            console.warn('Failed to get pubkey from window.nostr:', error);
            setWindowNostrUser(null);
          }
        } else {
          console.log('window.nostr not available');
          setWindowNostrUser(null);
        }
      } else {
        setWindowNostrUser(null);
      }
    };
    
    checkWindowNostr();
  }, []);

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

  const user = users[0] as NUser | undefined;
  
  // Fallback mechanism for users not detected by Nostrify
  const fallbackUser = useMemo(() => {
    if (user) return null;
    
    // First priority: use window.nostr detected user (most reliable)
    if (windowNostrUser) {
      console.log('Using window.nostr fallback for user:', windowNostrUser.pubkey);
      return windowNostrUser as any;
    }
    
    // Second priority: use loggedInAccount if available
    if (loggedInAccount) {
      console.log('Using loggedInAccount fallback for user:', loggedInAccount.pubkey);
      const signer = typeof window !== 'undefined' && (window as any).nostr ? (window as any).nostr : null;
      console.log('loggedInAccount fallback signer:', signer ? 'available' : 'null');
      return {
        pubkey: loggedInAccount.pubkey,
        signer,
        method: 'extension' as const
      } as any;
    }
    
    return null;
  }, [user, loggedInAccount, windowNostrUser]);
  
  const finalUser = user || fallbackUser;
  const author = useAuthor(finalUser?.pubkey);

  return {
    user: finalUser,
    users: finalUser ? [finalUser] : [],
    ...author.data,
  };
}
