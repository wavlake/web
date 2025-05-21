import { useMarkdown } from "@/hooks/useMarkdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  const html = useMarkdown("/About.md");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>About +chorus</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </CardContent>
      </Card>
    </div>
  );
}
