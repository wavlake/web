import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { parseNostrAddress } from "@/lib/nostr-utils";
import Header from "@/components/ui/Header";

export default function GroupGuidelines() {
  const { groupId } = useParams<{ groupId: string }>();
  const { nostr } = useNostr();
  const [parsedId, setParsedId] = useState<{ kind: number; pubkey: string; identifier: string } | null>(null);

  useEffect(() => {
    if (groupId) {
      const parsed = parseNostrAddress(decodeURIComponent(groupId));
      if (parsed) {
        setParsedId(parsed);
      }
    }
  }, [groupId]);

  const { data: community, isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["community", parsedId?.pubkey, parsedId?.identifier],
    queryFn: async (c) => {
      if (!parsedId) throw new Error("Invalid community ID");

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([{
        kinds: [34550],
        authors: [parsedId.pubkey],
        "#d": [parsedId.identifier]
      }], { signal });

      if (events.length === 0) throw new Error("Community not found");
      return events[0];
    },
    enabled: !!nostr && !!parsedId,
  });

  const nameTag = community?.tags.find(tag => tag[0] === "name");
  const guidelinesTag = community?.tags.find(tag => tag[0] === "guidelines");

  const name = nameTag ? nameTag[1] : (parsedId?.identifier || "Unnamed Group");
  const guidelines = guidelinesTag ? guidelinesTag[1] : "";

  useEffect(() => {
    if (name && name !== "Unnamed Group") {
      document.title = `+chorus - ${name} Guidelines`;
    } else {
      document.title = "+chorus - Group Guidelines";
    }
    return () => {
      document.title = "+chorus";
    };
  }, [name]);

  if (isLoadingCommunity || !parsedId) {
    return (
      <div className="container mx-auto py-1 px-3 sm:px-4">
        <Header />
        <h1 className="text-2xl font-bold mb-4">Loading guidelines...</h1>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto py-1 px-3 sm:px-4">
        <Header />
        <h1 className="text-2xl font-bold mb-4">Group not found</h1>
        <p>The group you're looking for doesn't exist or has been deleted.</p>
        <Button asChild className="mt-2">
          <Link to="/groups">Back to Groups</Link>
        </Button>
      </div>
    );
  }

  if (!guidelines || guidelines.trim().length === 0) {
    return (
      <div className="container mx-auto py-1 px-3 sm:px-4">
        <Header />
        
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to={`/group/${encodeURIComponent(groupId || '')}`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {name}
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {name} Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This group hasn't set up any guidelines yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-1 px-3 sm:px-4">
      <Header />
      
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={`/group/${encodeURIComponent(groupId || '')}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to {name}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {name} Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {guidelines}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}