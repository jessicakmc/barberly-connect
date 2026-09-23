import { useEffect } from "react";

/** Client-side replacement for TanStack Start's per-route `head()` meta. */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
  }, [title, description]);
}

function setMeta(attr: "name" | "property", key: string, content?: string) {
  if (content === undefined) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
