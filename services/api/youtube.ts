export type HighlightCategory = "fifa-world-cup-2026" | "uefa-champions-league" | "mls-2026";

export type OfficialHighlight = {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  href: string;
  source: string;
  embedUrl: string;
  watchUrl: string;
  embeddable: boolean;
  category: HighlightCategory;
};

export type HighlightCompetition = {
  id: HighlightCategory;
  title: string;
  href: string;
  items: OfficialHighlight[];
};

type HighlightResponse = {
  source: string;
  channelId: string;
  lastRefreshAt?: string;
  highlights: OfficialHighlight[];
  fifaWorldCup2026: OfficialHighlight[];
  uefaChampionsLeague: OfficialHighlight[];
  mls2026: OfficialHighlight[];
};

let highlightResponsePromise: Promise<HighlightResponse> | null = null;
let highlightResponseCachedAt = 0;
const highlightResponseClientTtlMs = 1000 * 60 * 5;

async function getOfficialHighlightResponse(): Promise<HighlightResponse> {
  const now = Date.now();
  if (highlightResponsePromise && now - highlightResponseCachedAt < highlightResponseClientTtlMs) return highlightResponsePromise;

  highlightResponseCachedAt = now;
  highlightResponsePromise = fetch("/api/youtube/highlights", {
    headers: { Accept: "application/json" }
  }).then(async (response) => {
    if (!response.ok) throw new Error("Unable to load official highlights");
    return (await response.json()) as HighlightResponse;
  }).catch((error) => {
    highlightResponsePromise = null;
    throw error;
  });

  return highlightResponsePromise;
}

export async function getHighlightCompetitions(): Promise<HighlightCompetition[]> {
  const data = await getOfficialHighlightResponse();
  const competitions: HighlightCompetition[] = [
    { id: "fifa-world-cup-2026", title: "FIFA World Cup", href: "/highlights/fifa-world-cup-2026", items: data.fifaWorldCup2026 ?? [] },
    { id: "uefa-champions-league", title: "UEFA Champions League", href: "/highlights/uefa-champions-league", items: data.uefaChampionsLeague ?? [] }
  ];
  return competitions.filter((competition) => competition.items.length > 0);
}

export async function getFifaWorldCupHighlights(): Promise<OfficialHighlight[]> {
  const data = await getOfficialHighlightResponse();
  return data.fifaWorldCup2026;
}

export async function getUefaChampionsLeagueHighlights(): Promise<OfficialHighlight[]> {
  const data = await getOfficialHighlightResponse();
  return data.uefaChampionsLeague;
}

export async function getMls2026Highlights(): Promise<OfficialHighlight[]> {
  const data = await getOfficialHighlightResponse();
  return data.mls2026 ?? [];
}

function formatTimeAgo(value?: string) {
  if (!value) return "Official Highlight";
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff) || diff < 0) return "Official Highlight";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function highlightToHeroCard(highlight: OfficialHighlight) {
  return {
    id: highlight.id,
    slug: highlight.videoId,
    title: highlight.title,
    competition: highlight.category === "uefa-champions-league" ? "UEFA Champions League" : highlight.category === "mls-2026" ? "MLS 2026" : highlight.source || highlight.channelTitle,
    meta: formatTimeAgo(highlight.publishedAt),
    image: highlight.thumbnail,
    thumbnail: highlight.thumbnail,
    live: false,
    badge: "Highlight",
    teams: [],
    sources: [],
    href: highlight.href,
    youtubeId: highlight.videoId,
    publishedAt: highlight.publishedAt
  };
}
