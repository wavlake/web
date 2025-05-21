import { useQuery } from '@tanstack/react-query';

/**
 * A hook to verify NIP-05 identifiers by checking the .well-known/nostr.json file
 * at the domain and comparing the public key.
 * 
 * @param nip05 The NIP-05 identifier to verify (e.g. "name@example.com")
 * @param pubkey The pubkey to verify against
 * @returns An object with isVerified status and error message if any
 */
export function useNip05Verification(nip05: string | undefined, pubkey: string) {
  return useQuery({
    queryKey: ['nip05Verification', nip05, pubkey],
    queryFn: async () => {
      // Skip verification if no NIP-05 is provided
      if (!nip05) {
        return { isVerified: false, error: 'No NIP-05 identifier provided' };
      }
      
      try {
        // Parse NIP-05 identifier
        const atIndex = nip05.lastIndexOf('@');
        if (atIndex === -1) {
          return { isVerified: false, error: 'Invalid NIP-05 format' };
        }
        
        const localPart = nip05.substring(0, atIndex);
        const domain = nip05.substring(atIndex + 1);
        
        if (!localPart || !domain) {
          return { isVerified: false, error: 'Invalid NIP-05 format' };
        }
        
        // Fetch the well-known JSON file
        const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(localPart)}`;
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(5000) // Add timeout to prevent hanging requests
        });
        
        if (!response.ok) {
          return { 
            isVerified: false, 
            error: `Failed to fetch NIP-05 data: ${response.status} ${response.statusText}` 
          };
        }
        
        // Parse the response
        const data = await response.json();
        
        // Check if the names object exists and contains our local part
        if (!data.names || !data.names[localPart]) {
          return { 
            isVerified: false, 
            error: 'NIP-05 identifier not found in domain record' 
          };
        }
        
        // Compare the pubkey
        const verifiedPubkey = data.names[localPart];
        const isVerified = verifiedPubkey === pubkey;
        
        return { 
          isVerified, 
          error: isVerified ? undefined : 'Public key mismatch' 
        };
      } catch (error) {
        console.error('NIP-05 verification error:', error);
        return { 
          isVerified: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
    // Stale for 1 hour (verification results don't change frequently)
    staleTime: 60 * 60 * 1000,
    // Retry up to 2 times 
    retry: 2,
    // Only run if we have both parameters
    enabled: !!nip05 && !!pubkey,
  });
}