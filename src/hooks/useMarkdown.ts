import { useEffect, useState } from "react";
import { marked } from "marked";

export function useMarkdown(path: string) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(path)
      .then((res) => res.text())
      .then(async (md) => {
        const parsedHtml = await marked.parse(md);
        setHtml(parsedHtml);
      })
      .catch(() => setHtml("<p>Failed to load content.</p>"));
  }, [path]);

  return html;
}
