import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fifaChannelId = "UCpcTrCXblq78GZrTUTLWeBw";
const uefaChampionsLeaguePlaylistId = "PLn5vww_8o5Kty1TVJXxviSL86FfeX4yFc";
const mls2026PlaylistId = "PLcj4z4KsbIoXrLpj2pOVr_maRaxhW902-";
const highlightRefreshMs = 10 * 60 * 1000;
const cacheVersion = 6;
let memoryCache: HighlightCache = { version: cacheVersion, highlights: [] };
let memoryCacheUpdatedAt = 0;
const rejectedTitleTerms = [
  "Alt Cast",
  "Gamified",
  "Training",
  "Press Conference",
  "Preview",
  "Pre-match",
  "Reaction",
  "Draw",
  "Ceremony",
  "Interview",
  "Behind The Scenes",
  "Behind the Scenes",
  "Press",
  "Media",
  "Live Stream",
  "Watch Along"
];

type HighlightCategory = "fifa-world-cup-2026" | "uefa-champions-league" | "mls-2026";

type CachedHighlight = {
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

type HighlightCache = {
  version?: number;
  lastRefreshAt?: string;
  highlights: CachedHighlight[];
};

type YouTubeSearchItem = {
  id?: { videoId?: string; kind?: string };
  snippet?: YouTubeSnippet;
};

type YouTubePlaylistItem = {
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
  snippet?: YouTubeSnippet & { resourceId?: { videoId?: string } };
};

type YouTubeSnippet = {
  title?: string;
  channelTitle?: string;
  channelId?: string;
  publishedAt?: string;
  thumbnails?: { maxres?: { url?: string }; high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
};

type YouTubeVideoItem = {
  id?: string;
  status?: { embeddable?: boolean; privacyStatus?: string };
};

type YouTubeSearchResponse = {
  nextPageToken?: string;
  pageInfo?: { totalResults?: number; resultsPerPage?: number };
  items?: YouTubeSearchItem[];
  error?: unknown;
};

type YouTubePlaylistResponse = {
  nextPageToken?: string;
  pageInfo?: { totalResults?: number; resultsPerPage?: number };
  items?: YouTubePlaylistItem[];
  error?: unknown;
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
  error?: unknown;
};

function createSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "highlight";
}

function titleHasHighlight(title: string) {
  return /\bhighlights?\b/i.test(title);
}

function titleHasRejectedTerm(title: string) {
  return rejectedTitleTerms.some((term) => new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}\\b`, "i").test(title));
}

function isMatchHighlightTitle(title: string) {
  return titleHasHighlight(title) && !titleHasRejectedTerm(title);
}

function isUefaChampionsLeagueTitle(title: string) {
  if (titleHasRejectedTerm(title)) return false;
  return /\bkey moments\b/i.test(title) || title.includes("UEFA Champions League 2026");
}

function isFifaWorldCupTitle(title: string) {
  return /world\s+cup/i.test(title) && isMatchHighlightTitle(title);
}

function getThumbnail(snippet: YouTubeSnippet | undefined, videoId: string) {
  return snippet?.thumbnails?.maxres?.url ?? snippet?.thumbnails?.high?.url ?? snippet?.thumbnails?.medium?.url ?? snippet?.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function makeHighlight(input: {
  videoId: string;
  snippet?: YouTubeSnippet;
  embeddable: boolean;
  category: HighlightCategory;
  source: string;
  forceExternal?: boolean;
}): CachedHighlight | null {
  const title = input.snippet?.title?.trim() ?? "";
  if (!input.videoId || !title) return null;

  const forceExternal = input.forceExternal === true;
  const embeddable = forceExternal ? false : input.embeddable;
  const watchUrl = `https://www.youtube.com/watch?v=${input.videoId}`;
  const hrefBase = input.category === "fifa-world-cup-2026" ? "/highlights/fifa-world-cup-2026" : input.category === "mls-2026" ? "/highlights/mls-2026" : "/highlights/uefa-champions-league";
  const internalHref = `${hrefBase}/${createSlug(title)}-${input.videoId}`;

  return {
    id: `${input.category}-${input.videoId}`,
    videoId: input.videoId,
    title,
    channelTitle: input.snippet?.channelTitle ?? input.source,
    channelId: input.snippet?.channelId ?? "",
    publishedAt: input.snippet?.publishedAt ?? new Date().toISOString(),
    thumbnail: getThumbnail(input.snippet, input.videoId),
    href: embeddable ? internalHref : watchUrl,
    source: input.source,
    embedUrl: embeddable ? `https://www.youtube.com/embed/${input.videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1` : "",
    watchUrl,
    embeddable,
    category: input.category
  };
}

async function readCache(): Promise<HighlightCache> {
  return { ...memoryCache, highlights: memoryCache.highlights ?? [] };
}

async function writeCache(cache: HighlightCache) {
  const unique = new Map<string, CachedHighlight>();
  for (const highlight of cache.highlights) unique.set(highlight.videoId, highlight);
  const highlights = Array.from(unique.values()).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  memoryCache = { ...cache, version: cacheVersion, highlights };
  memoryCacheUpdatedAt = Date.now();
  return memoryCache;
}

async function fetchFifaSearchPage(apiKey: string, pageToken?: string) {
  const url = new URL("https://youtube.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", fifaChannelId);
  url.searchParams.set("q", "FIFA World Cup Highlights");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  const data = (await response.json()) as YouTubeSearchResponse;
  console.log("[YouTube Highlights] FIFA search", {
    requestUrl: url.toString().replace(/([?&]key=)[^&]+/, "$1[REDACTED]"),
    pageToken: pageToken ?? "none",
    responseStatus: response.status,
    itemsReturned: data.items?.length ?? 0
  });
  return data;
}

async function fetchFifaItems(apiKey: string) {
  const items: YouTubeSearchItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const data = await fetchFifaSearchPage(apiKey, pageToken);
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

async function fetchPlaylistPage(apiKey: string, pageToken?: string) {
  const url = new URL("https://youtube.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", uefaChampionsLeaguePlaylistId);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  const data = (await response.json()) as YouTubePlaylistResponse;
  console.log("[YouTube Highlights] UEFA playlist", {
    requestUrl: url.toString().replace(/([?&]key=)[^&]+/, "$1[REDACTED]"),
    pageToken: pageToken ?? "none",
    responseStatus: response.status,
    itemsReturned: data.items?.length ?? 0
  });
  return data;
}

async function fetchMlsPlaylistItems(apiKey: string) {
  const url = new URL("https://youtube.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", mls2026PlaylistId);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  const data = (await response.json()) as YouTubePlaylistResponse;
  console.log("[YouTube Highlights] MLS playlist", {
    requestUrl: url.toString().replace(/([?&]key=)[^&]+/, "$1[REDACTED]"),
    responseStatus: response.status,
    itemsReturned: data.items?.length ?? 0
  });
  return data.items ?? [];
}

async function fetchUefaPlaylistItems(apiKey: string) {
  const items: YouTubePlaylistItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const data = await fetchPlaylistPage(apiKey, pageToken);
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

async function fetchVideoEmbeddability(videoIds: string[], apiKey: string) {
  const statuses = new Map<string, boolean>();
  for (let index = 0; index < videoIds.length; index += 50) {
    const ids = videoIds.slice(index, index + 50);
    if (ids.length === 0) continue;
    const url = new URL("https://youtube.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status");
    url.searchParams.set("id", ids.join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    const raw = (await response.json()) as YouTubeVideosResponse;
    for (const item of raw.items ?? []) if (item.id) statuses.set(item.id, item.status?.embeddable === true);
    console.log("[YouTube Highlights] embeddability", {
      requestUrl: url.toString().replace(/([?&]key=)[^&]+/, "$1[REDACTED]"),
      responseStatus: response.status,
      itemsReturned: raw.items?.length ?? 0
    });
  }
  return statuses;
}

function uniqueByVideoId(items: CachedHighlight[]) {
  const unique = new Map<string, CachedHighlight>();
  for (const item of items) unique.set(item.videoId, item);
  return Array.from(unique.values()).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function highlightsByCategory(cache: HighlightCache, category: HighlightCategory) {
  return cache.highlights.filter((item) => item.category === category);
}

async function syncHighlights() {
  const cache = await readCache();
  const apiKey = process.env.YOUTUBE_API_KEY;
  const lastRefresh = cache.lastRefreshAt ? Date.parse(cache.lastRefreshAt) : 0;
  const cachedFifaHighlights = highlightsByCategory(cache, "fifa-world-cup-2026");
  const cachedUefaHighlights = highlightsByCategory(cache, "uefa-champions-league");
  const cachedMlsHighlights = highlightsByCategory(cache, "mls-2026");
  const cacheHasRequiredCategories = cachedFifaHighlights.length > 0 && cachedUefaHighlights.length > 0 && cachedMlsHighlights.length > 0;
  if (cache.version === cacheVersion && cacheHasRequiredCategories && Date.now() - lastRefresh < highlightRefreshMs) return cache;
  if (!apiKey) return cache;

  const fifaItems = (await fetchFifaItems(apiKey)).filter((item) => isFifaWorldCupTitle(item.snippet?.title?.trim() ?? ""));
  const uefaItems = (await fetchUefaPlaylistItems(apiKey)).filter((item) => isUefaChampionsLeagueTitle(item.snippet?.title?.trim() ?? ""));
  let mlsItems: YouTubePlaylistItem[] = [];
  try {
    mlsItems = await fetchMlsPlaylistItems(apiKey);
  } catch (error) {
    console.error("[YouTube Highlights] MLS playlist failed", error);
  }
  const allVideoIds = Array.from(new Set([
    ...fifaItems.map((item) => item.id?.videoId),
    ...uefaItems.map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId),
    ...mlsItems.map((item) => item.snippet?.resourceId?.videoId)
  ].filter((id): id is string => Boolean(id))));
  const embeddability = await fetchVideoEmbeddability(allVideoIds, apiKey);

  const fifaHighlights = fifaItems.flatMap((item) => {
    const videoId = item.id?.videoId;
    if (!videoId) return [];
    const highlight = makeHighlight({ videoId, snippet: item.snippet, embeddable: false, category: "fifa-world-cup-2026", source: "FIFA", forceExternal: true });
    return highlight ? [highlight] : [];
  });

  const uefaHighlights = uefaItems.flatMap((item) => {
    const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
    if (!videoId || embeddability.get(videoId) !== true) return [];
    const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
    const snippet = { ...item.snippet, publishedAt };
    const highlight = makeHighlight({ videoId, snippet, embeddable: true, category: "uefa-champions-league", source: "Sony Sports Network" });
    return highlight ? [highlight] : [];
  });

  const mlsHighlights = mlsItems.flatMap((item) => {
    const videoId = item.snippet?.resourceId?.videoId;
    if (!videoId || embeddability.get(videoId) !== true) return [];
    const highlight = makeHighlight({ videoId, snippet: item.snippet, embeddable: true, category: "mls-2026", source: item.snippet?.channelTitle ?? "MLS" });
    return highlight ? [highlight] : [];
  });

  const preservedOther = cache.version === cacheVersion ? cache.highlights.filter((item) => item.category !== "fifa-world-cup-2026" && item.category !== "uefa-champions-league" && item.category !== "mls-2026") : [];
  const nextFifaHighlights = uniqueByVideoId([...fifaHighlights, ...cachedFifaHighlights]);
  const nextUefaHighlights = uniqueByVideoId([...uefaHighlights, ...cachedUefaHighlights]);
  const nextMlsHighlights = uniqueByVideoId([...mlsHighlights, ...cachedMlsHighlights]).slice(0, 10);
  return writeCache({
    lastRefreshAt: new Date().toISOString(),
    highlights: uniqueByVideoId([...preservedOther, ...nextFifaHighlights, ...nextUefaHighlights, ...nextMlsHighlights])
  });
}
function categoryHighlights(cache: HighlightCache, category: HighlightCategory) {
  return cache.highlights
    .filter((item) => item.category === category)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function buildHighlightsResponse(cache: HighlightCache, cached: boolean) {
  const fifaWorldCup2026 = categoryHighlights(cache, "fifa-world-cup-2026");
  const uefaChampionsLeague = categoryHighlights(cache, "uefa-champions-league");
  const mls2026 = categoryHighlights(cache, "mls-2026").slice(0, 10);

  return NextResponse.json({
    success: true,
    cached,
    data: cache.highlights,
    source: "Official football highlights",
    channelId: fifaChannelId,
    lastRefreshAt: cache.lastRefreshAt,
    highlights: fifaWorldCup2026,
    fifaWorldCup2026,
    uefaChampionsLeague,
    mls2026
  });
}

export async function GET() {
  try {
    const beforeRefresh = memoryCacheUpdatedAt;
    const cache = await syncHighlights();
    return buildHighlightsResponse(cache, beforeRefresh === memoryCacheUpdatedAt);
  } catch (error) {
    console.error("[YouTube Highlights] safe fallback used", error);
    const fallbackCache = await readCache();
    return buildHighlightsResponse(fallbackCache, true);
  }
}
