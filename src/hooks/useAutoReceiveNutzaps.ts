import { useEffect, useRef, useCallback } from 'react';
import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNutzapInfo } from '@/hooks/useNutzaps';
import { useReceivedNutzaps, useRedeemNutzap, ReceivedNutzap } from '@/hooks/useReceivedNutzaps';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import { getLastEventTimestamp } from '@/lib/nostrTimestamps';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { formatBalance } from '@/lib/cashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { toast } from 'sonner';

/**
 * Hook that automatically receives nutzaps when the wallet is loaded
 * and sets up real-time subscriptions for incoming nutzaps
 */
export function useAutoReceiveNutzaps() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const nutzapInfoQuery = useNutzapInfo(user?.pubkey);
  const { data: fetchedNutzaps } = useReceivedNutzaps();
  const { mutateAsync: redeemNutzap } = useRedeemNutzap();
  const walletUiStore = useWalletUiStore();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();
  
  // Keep track of processed event IDs to avoid duplicates
  const processedEventIds = useRef<Set<string>>(new Set());
  const subscriptionController = useRef<AbortController | null>(null);
  const processNutzapRef = useRef<(nutzap: ReceivedNutzap) => Promise<void>>();

  // Process and auto-redeem a nutzap
  const processNutzap = useCallback(async (nutzap: ReceivedNutzap) => {
    if (nutzap.redeemed || processedEventIds.current.has(nutzap.id)) {
      return;
    }

    processedEventIds.current.add(nutzap.id);
    
    // Format amount based on user preference (moved inside to avoid dependency issues)
    const formatAmount = (sats: number) => {
      if (showSats) {
        return formatBalance(sats);
      } else if (btcPrice) {
        return formatUSD(satsToUSD(sats, btcPrice.USD));
      }
      return formatBalance(sats);
    };

    try {
      await redeemNutzap(nutzap);
      
      const amount = nutzap.proofs.reduce((sum, p) => sum + p.amount, 0);
      
      // Show success notification
      toast.success(`eCash received! ${formatAmount(amount)}`, {
        description: nutzap.content || 'Auto-redeemed to your wallet',
        duration: 4000,
      });

      // Animate the balance in the header
      walletUiStore.setBalanceAnimation(true);
      setTimeout(() => walletUiStore.setBalanceAnimation(false), 1000);
      
    } catch (error) {
      console.error('Failed to auto-redeem nutzap:', error);
      
      const amount = nutzap.proofs.reduce((sum, p) => sum + p.amount, 0);
      
      // Show notification that eCash was received but manual redemption needed
      toast.info(`eCash received! ${formatAmount(amount)}`, {
        description: 'Manual redemption required - check your wallet',
        action: {
          label: 'Open Wallet',
          onClick: () => walletUiStore.setShowWallet(true),
        },
        duration: 5000,
      });
    }
  }, [redeemNutzap, walletUiStore, showSats, btcPrice]); // Stable dependencies only

  // Update the ref whenever processNutzap changes
  processNutzapRef.current = processNutzap;

  // Process initial nutzaps on load
  useEffect(() => {
    if (!fetchedNutzaps || fetchedNutzaps.length === 0) return;

    // Process any unredeemed nutzaps
    const unredeemedNutzaps = fetchedNutzaps.filter(n => !n.redeemed);
    
    unredeemedNutzaps.forEach(nutzap => {
      processNutzap(nutzap);
    });

    // Add all fetched nutzap IDs to processed set
    fetchedNutzaps.forEach(n => processedEventIds.current.add(n.id));
  }, [fetchedNutzaps, processNutzap]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !nutzapInfoQuery.data) return;

    // Get trusted mints from nutzap info
    const trustedMints = nutzapInfoQuery.data.mints.map((mint) => mint.url);
    if (trustedMints.length === 0) return;

    // Cancel any existing subscription
    if (subscriptionController.current) {
      subscriptionController.current.abort();
    }

    // Create new abort controller
    subscriptionController.current = new AbortController();
    const signal = subscriptionController.current.signal;

    // Create subscription filter
    const filter = {
      kinds: [CASHU_EVENT_KINDS.ZAP],
      "#p": [user.pubkey],
      "#u": trustedMints,
    };

    // Get the last timestamp of redemption events
    const lastRedemptionTimestamp = getLastEventTimestamp(
      user.pubkey,
      CASHU_EVENT_KINDS.HISTORY
    );
    
    if (lastRedemptionTimestamp) {
      Object.assign(filter, { since: lastRedemptionTimestamp });
    }

    // Start real-time subscription
    const subscribeToNutzaps = async () => {
      try {
        // 1. Initial query to catch any recent events
        const events = await nostr.query([filter], { signal });
        
        for (const event of events) {
          if (processedEventIds.current.has(event.id)) continue;
          
          try {
            // Get the mint URL from tags
            const mintTag = event.tags.find((tag) => tag[0] === "u");
            if (!mintTag) continue;
            const mintUrl = mintTag[1];

            // Verify the mint is in the trusted list
            if (!trustedMints.includes(mintUrl)) continue;

            // Get proofs from tags
            const proofTags = event.tags.filter((tag) => tag[0] === "proof");
            if (proofTags.length === 0) continue;

            const proofs = proofTags
              .map((tag) => {
                try {
                  return JSON.parse(tag[1]);
                } catch (e) {
                  console.error("Failed to parse proof:", e);
                  return null;
                }
              })
              .filter(Boolean);

            if (proofs.length === 0) continue;

            // Get the zapped event if any
            let zappedEvent: string | undefined;
            const eventTag = event.tags.find((tag) => tag[0] === "e");
            if (eventTag) {
              zappedEvent = eventTag[1];
            }

            // Create nutzap object
            const nutzap: ReceivedNutzap = {
              id: event.id,
              pubkey: event.pubkey,
              createdAt: event.created_at,
              content: event.content,
              proofs,
              mintUrl,
              zappedEvent,
              redeemed: false,
            };

            // Process the nutzap using ref to avoid dependency issues
            if (processNutzapRef.current) {
              await processNutzapRef.current(nutzap);
            }
            
            // No need to refetch - using real-time subscriptions
            
          } catch (error) {
            console.error("Error processing nutzap event:", error);
          }
        }

        // 2. Set up persistent subscription for real-time updates
        const subscriptionStartTime = Math.floor(Date.now() / 1000);
        const subscriptionFilter = {
          ...filter,
          since: subscriptionStartTime // Only new events from now
        };

        for await (const msg of nostr.req([subscriptionFilter], { signal })) {
          if (signal.aborted) break;
          
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            
            if (processedEventIds.current.has(event.id)) continue;
            
            try {
              // Get the mint URL from tags
              const mintTag = event.tags.find((tag) => tag[0] === "u");
              if (!mintTag) continue;
              const mintUrl = mintTag[1];

              // Verify the mint is in the trusted list
              if (!trustedMints.includes(mintUrl)) continue;

              // Get proofs from tags
              const proofTags = event.tags.filter((tag) => tag[0] === "proof");
              if (proofTags.length === 0) continue;

              const proofs = proofTags
                .map((tag) => {
                  try {
                    return JSON.parse(tag[1]);
                  } catch (e) {
                    console.error("Failed to parse proof:", e);
                    return null;
                  }
                })
                .filter(Boolean);

              if (proofs.length === 0) continue;

              // Get the zapped event if any
              let zappedEvent: string | undefined;
              const eventTag = event.tags.find((tag) => tag[0] === "e");
              if (eventTag) {
                zappedEvent = eventTag[1];
              }

              // Create nutzap object
              const nutzap: ReceivedNutzap = {
                id: event.id,
                pubkey: event.pubkey,
                createdAt: event.created_at,
                content: event.content,
                proofs,
                mintUrl,
                zappedEvent,
                redeemed: false,
              };

              // Process the nutzap using ref to avoid dependency issues
              if (processNutzapRef.current) {
                await processNutzapRef.current(nutzap);
              }
              
              // No need to refetch - using real-time subscriptions
              
            } catch (error) {
              console.error("Error processing nutzap event:", error);
            }
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error("Error in nutzap subscription:", error);
        }
      }
    };

    // Start subscription
    subscribeToNutzaps();

    // Cleanup on unmount
    return () => {
      if (subscriptionController.current) {
        subscriptionController.current.abort();
        subscriptionController.current = null;
      }
    };
  }, [user, nutzapInfoQuery.data, nostr]); // Removed processNutzap to prevent subscription restarts from changing dependencies

  return {
    // Auto-receive functionality is handled internally
    // No need to expose refetch with real-time subscriptions
  };
}