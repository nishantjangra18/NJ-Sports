"use client";

import type { MatchCardView, StreamedTeam } from "@/services/api/types";

const watchRoutePrefix = "nj-sports-watch-route:";

export type StoredWatchRoute = {
  slug: string;
  source: string;
  id: string;
  title: string;
  image: string;
  competition?: string;
  live?: boolean;
  teams?: StreamedTeam[];
  fixtureId?: string;
  storedAt: number;
};

export function storeWatchRoute(match: MatchCardView) {
  if (typeof window === "undefined" || !match.watchSource || !match.watchId) return;
  const route: StoredWatchRoute = {
    slug: match.slug,
    source: match.watchSource,
    id: match.watchId,
    title: match.title,
    image: match.image,
    competition: match.competition,
    live: match.live,
    teams: match.teams,
    fixtureId: match.fixtureId,
    storedAt: Date.now()
  };
  window.sessionStorage.setItem(`${watchRoutePrefix}${match.slug}`, JSON.stringify(route));
}

export function readWatchRoute(slug: string): StoredWatchRoute | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(`${watchRoutePrefix}${slug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredWatchRoute;
    return parsed.source && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}
