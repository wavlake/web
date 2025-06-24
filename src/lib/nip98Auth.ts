import { nip98 } from "nostr-tools";
import type { NostrEvent } from "@nostrify/nostrify";

// Extend Window interface to include nostr
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: NostrEvent): Promise<NostrEvent>;
    };
  }
}

/**
 * Create NIP-98 auth header for HTTP requests using nostr-tools
 * @param url - Full URL being requested
 * @param method - HTTP method (GET, POST, etc.)
 * @param body - Request body (for POST requests)
 * @param signer - Signer object with signEvent method
 * @returns Promise<string> - Authorization header value
 */
export async function createNip98AuthHeader(
  url: string,
  method: string,
  body?: Record<string, any> | string | undefined,
  signer?: {
    signEvent: (event: NostrEvent) => Promise<NostrEvent>;
    getPublicKey?: () => Promise<string>;
  } | any
): Promise<string> {
  let signerFunction;
  
  if (signer?.signEvent) {
    signerFunction = signer.signEvent;
  } else if (typeof signer === 'function') {
    signerFunction = signer;
  } else if (signer?.getPublicKey && signer?.signEvent) {
    // For window.nostr-like objects
    signerFunction = signer.signEvent.bind(signer);
  } else {
    throw new Error("Signer with signEvent method is required for NIP-98 authentication");
  }

  // Use nip98.getToken which handles everything internally
  // This includes creating the auth event, signing it, and packing it into a token
  // The payload should be an object - nip98.getToken handles stringification internally
  let payload: Record<string, any> | undefined;
  if (body !== undefined) {
    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch {
        // If it's not valid JSON, wrap it in an object
        payload = { data: body };
      }
    } else {
      payload = body;
    }
  }
  
  const token = await nip98.getToken(
    url,
    method,
    signerFunction,
    true, // includeAuthorizationScheme - adds "Nostr " prefix
    payload // payload as object
  );

  return token;
}