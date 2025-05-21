import { useEffect, useState } from "react";
import { marked } from "marked";

export function useMarkdownWithoutFirstHeading(path: string) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(path)
      .then((res) => res.text())
      .then(async (md) => {
        // Remove the first heading (# Title) from the markdown
        const contentWithoutFirstHeading = md.replace(/^# .*$/m, "").trim();
        const parsedHtml = await marked.parse(contentWithoutFirstHeading);
        setHtml(parsedHtml);
      })
      .catch(() => setHtml("<p>Failed to load content.</p>"));
  }, [path]);

  return html;
}