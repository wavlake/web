import { useNostr } from "@/hooks/useNostr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KINDS } from "@/lib/nostr-kinds";
import { useState, useEffect, useRef } from "react";

export function useOpenReportsCount(communityId: string) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);
  const subscriptionRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!nostr || !communityId) {
      setCount(0);
      return;
    }

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.abort();
    }

    const controller = new AbortController();
    subscriptionRef.current = controller;

    async function setupSubscription() {
      try {
        // Track resolved report IDs
        const resolvedReportIds = new Set<string>();
        const reportIds = new Set<string>();

        // First, get initial data with query() for historical reports
        const initialReports = await nostr.query([{
          kinds: [KINDS.REPORT],
          "#a": [communityId],
          limit: 100,
        }], { signal: controller.signal });

        for (const report of initialReports) {
          reportIds.add(report.id);
        }

        // Get initial resolution events
        if (reportIds.size > 0) {
          const initialResolutions = await nostr.query([{
            kinds: [KINDS.GROUP_CLOSE_REPORT],
            "#e": Array.from(reportIds),
            "#a": [communityId],
          }], { signal: controller.signal });

          for (const resolution of initialResolutions) {
            const reportId = resolution.tags.find(tag => tag[0] === "e")?.[1];
            if (reportId) {
              resolvedReportIds.add(reportId);
            }
          }
        }

        // Calculate initial count
        const initialCount = Array.from(reportIds).filter(id => !resolvedReportIds.has(id)).length;
        setCount(initialCount);

        // Set up persistent subscription for real-time updates
        // Subscribe to both reports and resolutions in a single subscription
        for await (const msg of nostr.req([{
          kinds: [KINDS.REPORT, KINDS.GROUP_CLOSE_REPORT],
          "#a": [communityId],
          since: Math.floor(Date.now() / 1000) // Only new events from now
        }], { signal: controller.signal })) {
          if (controller.signal.aborted) break;
          
          if (msg[0] === 'EVENT') {
            const event = msg[2];
            
            if (event.kind === KINDS.REPORT) {
              // New report
              if (!reportIds.has(event.id)) {
                reportIds.add(event.id);
                if (!resolvedReportIds.has(event.id)) {
                  setCount(prev => prev + 1);
                }
              }
            } else if (event.kind === KINDS.GROUP_CLOSE_REPORT) {
              // New resolution
              const reportId = event.tags.find(tag => tag[0] === "e")?.[1];
              if (reportId && reportIds.has(reportId) && !resolvedReportIds.has(reportId)) {
                resolvedReportIds.add(reportId);
                setCount(prev => prev - 1);
              }
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[useOpenReportsCount] Subscription error:', error);
          // Fallback to 0 on error
          setCount(0);
        }
      }
    }

    setupSubscription();

    return () => {
      controller.abort();
      subscriptionRef.current = null;
    };
  }, [nostr, communityId]);

  // Return as React Query format for compatibility
  return {
    data: count,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
}