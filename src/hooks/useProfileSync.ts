import { useNostr } from "@nostrify/react";
import { useCallback } from "react";
import { NostrEvent, NRelay1 } from "@nostrify/nostrify";

const PRIMARY_RELAY = "wss://relay.wavlake.com/";
const FALLBACK_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.nos.social",
  "wss://cache2.primal.net/v1",
];

export function useProfileSync() {
  const { nostr } = useNostr();

  const syncProfile = useCallback(
    async (pubkey: string) => {
      try {

        // First, check if the kind 0 event exists on the primary relay
        const primaryRelayEvents = await nostr.query(
          [{ kinds: [0], authors: [pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(3000) }
        );

        if (primaryRelayEvents.length > 0) {
          return;
        }


        // Try each fallback relay
        for (const relayUrl of FALLBACK_RELAYS) {
          try {

            // Create a temporary connection to the fallback relay
            const relay = new NRelay1(relayUrl);

            // Query for the kind 0 event
            const events = await relay.query(
              [{ kinds: [0], authors: [pubkey], limit: 1 }],
              { signal: AbortSignal.timeout(5000) }
            );

            if (events.length > 0) {
              const profileEvent = events[0];

              // Republish the event exactly as-is to the primary relay
              await nostr.event(profileEvent, {
                relays: [PRIMARY_RELAY],
              });


              // Close the temporary relay connection
              relay.close();
              return;
            }

            // Close the relay if no event found
            relay.close();
          } catch (error) {
            console.error(
              `[ProfileSync] Error querying fallback relay ${relayUrl}:`,
              error
            );
          }
        }

      } catch (error) {
        console.error("[ProfileSync] Error during profile sync:", error);
      }
    },
    [nostr]
  );

  return { syncProfile };
}
