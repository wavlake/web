import { useMarkdown } from "@/hooks/useMarkdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  const html = useMarkdown("/About.md");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-serif">About +chorus</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="prose prose-lg dark:prose-invert max-w-none
                       prose-headings:font-serif prose-headings:font-medium
                       prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                       prose-p:text-base prose-p:leading-relaxed
                       prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                       prose-strong:text-foreground/90 prose-strong:font-semibold
                       prose-li:marker:text-primary/70 prose-li:my-1
                       prose-img:rounded-md prose-img:shadow-sm
                       prose-hr:border-border/40"
            dangerouslySetInnerHTML={{ __html: html }} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
