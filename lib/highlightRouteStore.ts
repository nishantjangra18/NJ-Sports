"use client";

import type { OfficialHighlight } from "@/services/api/youtube";

const highlightRoutePrefix = "nj-sports-highlight-route:";

export function storeHighlightRoute(highlight: OfficialHighlight) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${highlightRoutePrefix}${highlight.href.split("/").pop()}`, JSON.stringify(highlight));
}

export function readHighlightRoute(slug: string): OfficialHighlight | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(`${highlightRoutePrefix}${slug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OfficialHighlight;
    return parsed.videoId ? parsed : null;
  } catch {
    return null;
  }
}
