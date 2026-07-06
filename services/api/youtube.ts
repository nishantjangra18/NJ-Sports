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
  source?: string;
  channelId?: string;
  lastRefreshAt?: string;
  highlights?: OfficialHighlight[];
  fifaWorldCup2026?: OfficialHighlight[];
  uefaChampionsLeague?: OfficialHighlight[];
  mls2026?: OfficialHighlight[];
};

let lastSuccessfulHighlightResponse: HighlightResponse | null = null;
let highlightResponsePromise: Promise<HighlightResponse> | null = null;
let highlightResponseCachedAt = 0;
const highlightResponseClientTtlMs = 1000 * 60 * 5;

function isHighlightCategory(value: unknown): value is HighlightCategory {
  return value === "fifa-world-cup-2026" || value === "uefa-champions-league" || value === "mls-2026";
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHighlight(value: unknown): OfficialHighlight | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<OfficialHighlight>;
  const videoId = asText(item.videoId);
  const title = asText(item.title);
  const category = item.category;
  if (!videoId || !title || !isHighlightCategory(category)) return null;

  const watchUrl = asText(item.watchUrl) || `https://www.youtube.com/watch?v=${videoId}`;
  return {
    id: asText(item.id) || `${category}-${videoId}`,
    videoId,
    title,
    channelTitle: asText(item.channelTitle) || asText(item.source) || "Official Highlights",
    channelId: asText(item.channelId),
    publishedAt: asText(item.publishedAt) || new Date(0).toISOString(),
    thumbnail: asText(item.thumbnail) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    href: asText(item.href) || watchUrl,
    source: asText(item.source) || asText(item.channelTitle) || "Official Highlights",
    embedUrl: asText(item.embedUrl),
    watchUrl,
    embeddable: item.embeddable === true,
    category
  };
}

function normalizeHighlights(value: unknown): OfficialHighlight[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, OfficialHighlight>();
  for (const item of value) {
    const highlight = normalizeHighlight(item);
    if (highlight) unique.set(highlight.videoId, highlight);
  }
  return Array.from(unique.values()).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function normalizeHighlightResponse(value: unknown): HighlightResponse {
  const payload = value && typeof value === "object" ? value as HighlightResponse : {};
  const fifaWorldCup2026 = normalizeHighlights(payload.fifaWorldCup2026 ?? payload.highlights).filter((item) => item.category === "fifa-world-cup-2026");
  const uefaChampionsLeague = normalizeHighlights(payload.uefaChampionsLeague).filter((item) => item.category === "uefa-champions-league");
  const mls2026 = normalizeHighlights(payload.mls2026).filter((item) => item.category === "mls-2026");
  const highlights = normalizeHighlights(payload.highlights ?? [...fifaWorldCup2026, ...uefaChampionsLeague, ...mls2026]);

  return {
    source: payload.source ?? "Official football highlights",
    channelId: payload.channelId ?? "",
    lastRefreshAt: payload.lastRefreshAt,
    highlights,
    fifaWorldCup2026,
    uefaChampionsLeague,
    mls2026
  };
}

function highlightCount(response: HighlightResponse) {
  return (response.highlights?.length ?? 0) + (response.fifaWorldCup2026?.length ?? 0) + (response.uefaChampionsLeague?.length ?? 0) + (response.mls2026?.length ?? 0);
}
async function fetchOfficialHighlightResponse(): Promise<HighlightResponse> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("/api/youtube/highlights", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Unable to load official highlights");

    const raw = await response.json();
    const data = normalizeHighlightResponse(raw);
    console.log("highlight response:", data);
    console.log("highlight length:", data.highlights?.length);

    if (highlightCount(data) > 0) {
      lastSuccessfulHighlightResponse = data as NonNullable<typeof lastSuccessfulHighlightResponse>;
      return data;
    }
  }

  return lastSuccessfulHighlightResponse ?? normalizeHighlightResponse(null);
}

async function getOfficialHighlightResponse(): Promise<HighlightResponse> {
  const now = Date.now();
  if (highlightResponsePromise && now - highlightResponseCachedAt < highlightResponseClientTtlMs) return highlightResponsePromise;

  highlightResponseCachedAt = now;
  highlightResponsePromise = fetchOfficialHighlightResponse().catch((error) => {
    highlightResponsePromise = null;
    if (lastSuccessfulHighlightResponse) return lastSuccessfulHighlightResponse;
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
  return data.fifaWorldCup2026 ?? [];
}

export async function getUefaChampionsLeagueHighlights(): Promise<OfficialHighlight[]> {
  const data = await getOfficialHighlightResponse();
  return data.uefaChampionsLeague ?? [];
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
