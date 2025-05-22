import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { NostrEvent } from "@nostrify/nostrify";

export interface Report extends NostrEvent {
  reportType: string;
  reportedPubkey: string;
  reportedEventId?: string;
  reason: string;
}

export function useGroupReports(communityId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["group-reports", communityId],
    queryFn: async (c) => {
      if (!communityId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Query for reports that have the community's a-tag
      const reports = await nostr.query([{
        kinds: [1984],
        "#a": [communityId],
        limit: 100,
      }], { signal });

      // Process the reports to extract relevant information
      return reports.map(report => {
        const pTag = report.tags.find(tag => tag[0] === "p");
        const eTag = report.tags.find(tag => tag[0] === "e");
        
        const reportType = pTag && pTag[2] ? pTag[2] : 
                          (eTag && eTag[2] ? eTag[2] : "other");
        
        const reportedPubkey = pTag ? pTag[1] : "";
        const reportedEventId = eTag ? eTag[1] : undefined;
        
        return {
          ...report,
          reportType,
          reportedPubkey,
          reportedEventId,
          reason: report.content
        } as Report;
      });
    },
    enabled: !!nostr && !!communityId,
  });
}