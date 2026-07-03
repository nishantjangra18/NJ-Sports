import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fifaChannelId = "UCpcTrCXblq78GZrTUTLWeBw";
const uefaChampionsLeaguePlaylistId = "PLn5vww_8o5Kty1TVJXxviSL86FfeX4yFc";
const cacheDir = path.join(process.cwd(), "data", "highlight-cache");
const cacheFile = path.join(cacheDir, "official-highlights.json");
const oneHourMs = 60 * 60 * 1000;
const cacheVersion = 5;
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

type HighlightCategory = "fifa-world-cup-2026" | "uefa-champions-league";

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
  const hrefBase = input.category === "fifa-world-cup-2026" ? "/highlights/fifa-world-cup-2026" : "/highlights/uefa-champions-league";
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
  try {
    const raw = await fs.readFile(cacheFile, "utf8");
    const parsed = JSON.parse(raw) as HighlightCache;
    return { ...parsed, highlights: parsed.highlights ?? [] };
  } catch {
    return { highlights: [] };
  }
}

async function writeCache(cache: HighlightCache) {
  await fs.mkdir(cacheDir, { recursive: true });
  const unique = new Map<string, CachedHighlight>();
  for (const highlight of cache.highlights) unique.set(highlight.videoId, highlight);
  const highlights = Array.from(unique.values()).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  await fs.writeFile(cacheFile, JSON.stringify({ ...cache, version: cacheVersion, highlights }, null, 2));
  return { ...cache, version: cacheVersion, highlights };
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

async function syncHighlights() {
  const cache = await readCache();
  const apiKey = process.env.YOUTUBE_API_KEY;
  const lastRefresh = cache.lastRefreshAt ? Date.parse(cache.lastRefreshAt) : 0;
  if (cache.version === cacheVersion && cache.highlights.length > 0 && Date.now() - lastRefresh < oneHourMs) return cache;
  if (!apiKey) return cache;

  const fifaItems = (await fetchFifaItems(apiKey)).filter((item) => isFifaWorldCupTitle(item.snippet?.title?.trim() ?? ""));
  const uefaItems = (await fetchUefaPlaylistItems(apiKey)).filter((item) => isUefaChampionsLeagueTitle(item.snippet?.title?.trim() ?? ""));
  const allVideoIds = Array.from(new Set([
    ...fifaItems.map((item) => item.id?.videoId),
    ...uefaItems.map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId)
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

  const preservedOther = cache.version === cacheVersion ? cache.highlights.filter((item) => item.category !== "fifa-world-cup-2026" && item.category !== "uefa-champions-league") : [];
  return writeCache({
    lastRefreshAt: new Date().toISOString(),
    highlights: uniqueByVideoId([...preservedOther, ...fifaHighlights, ...uefaHighlights])
  });
}

export async function GET() {
  const cache = await syncHighlights();
  const fifaWorldCup2026 = cache.highlights.filter((item) => item.category === "fifa-world-cup-2026").sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const uefaChampionsLeague = cache.highlights.filter((item) => item.category === "uefa-champions-league").sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return NextResponse.json({
    source: "Official football highlights",
    channelId: fifaChannelId,
    lastRefreshAt: cache.lastRefreshAt,
    highlights: fifaWorldCup2026,
    fifaWorldCup2026,
    uefaChampionsLeague
  });
}