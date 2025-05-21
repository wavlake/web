import { useEffect, useState } from "react";
import { marked } from "marked";

export function useMarkdown(path: string) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(path)
      .then((res) => res.text())
      .then((md) => setHtml(marked.parse(md)))
      .catch(() => setHtml("<p>Failed to load content.</p>"));
  }, [path]);

  return html;
}
