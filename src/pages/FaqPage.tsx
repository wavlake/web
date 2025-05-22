import { useMarkdownWithoutFirstHeading } from "@/hooks/useMarkdownWithoutFirstHeading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/ui/Header";

export default function FaqPage() {
  const html = useMarkdownWithoutFirstHeading("/faq.md");

  // Parse the HTML content to extract questions and answers
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = doc.querySelectorAll('h2');
  const faqItems = Array.from(headings).map(heading => {
    const question = heading.textContent || '';
    // Get all content until the next h2
    let answer = '';
    let currentElement = heading.nextElementSibling;
    while (currentElement && currentElement.tagName !== 'H2') {
      answer += currentElement.outerHTML;
      currentElement = currentElement.nextElementSibling;
    }
    return { question, answer };
  });

  return (
    <div className="container mx-auto py-4 px-6">
      <Header />
      
      <div className="max-w-3xl mx-auto mt-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold">FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div 
                      className="prose dark:prose-invert max-w-none
                               prose-headings:font-bold prose-headings:text-foreground
                               prose-h2:text-2xl prose-h3:text-xl
                               prose-p:text-base prose-p:leading-relaxed prose-p:text-foreground/90
                               prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                               prose-strong:text-foreground prose-strong:font-semibold
                               prose-li:marker:text-primary/70 prose-li:my-1 prose-li:text-foreground/90
                               prose-img:rounded-md prose-img:shadow-sm
                               prose-hr:border-border/40"
                      dangerouslySetInnerHTML={{ __html: item.answer }} 
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}