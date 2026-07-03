import type { ContentRowView, MatchCardView, SearchResult, StreamedMatch, StreamedSource, StreamedStream, StreamedTeam } from "@/services/api/types";

export const STREAMED_API_BASE_URL = process.env.NEXT_PUBLIC_STREAMED_API_BASE_URL ?? "https://streamed.pk/api";
export const STREAMED_IMAGE_BASE_URL = process.env.NEXT_PUBLIC_STREAMED_IMAGE_BASE_URL ?? `${STREAMED_API_BASE_URL.replace(/\/+$/, "")}/images`;

const fallbackImage = "/brand/nj-sports-logo.png";
const liveFootballThumbnail = "/images/Live-Stream-Thumbnail.jpg";

export function createMatchSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "match";
}

const footballTerms = ["football", "soccer", "premier league", "la liga", "serie a", "bundesliga", "ligue 1", "champions league", "europa league", "world cup", "afc", "uefa", "fifa"];

function normalizeTerm(value?: string): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isFootballMatch(match: StreamedMatch): boolean {
  const fields = [match.sport, match.category, match.competition, match.title, ...match.teams.map((team) => team.name)].map(normalizeTerm);
  return fields.some((field) => footballTerms.some((term) => field.includes(term)));
}

function onlyFootball(matches: StreamedMatch[]): StreamedMatch[] {
  return matches.filter(isFootballMatch);
}
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asImageAsset(value: unknown): string | undefined {
  if (typeof value === "string") return asString(value);
  if (!isObject(value)) return undefined;
  return (
    asString(value.url) ??
    asString(value.src) ??
    asString(value.path) ??
    asString(value.image) ??
    asString(value.id) ??
    asString(value.name)
  );
}

function unwrapArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isObject(value)) return [];
  const candidates = [value.data, value.sports, value.matches, value.streams, value.results];
  const found = candidates.find(Array.isArray);
  return Array.isArray(found) ? found : [];
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${STREAMED_API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load data");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Unable to load data");
  }

  return (await response.json()) as T;
}

export function imageUrl(asset?: string, type?: "badge" | "poster" | "competition"): string {
  if (!asset) return fallbackImage;
  if (asset.startsWith("http://") || asset.startsWith("https://")) return asset;
  if (asset.startsWith("/brand/") || asset.startsWith("/images/") || asset.startsWith("/api/images/")) return asset;
  const cleanAsset = asset.replace(/^\/+/, "");
  const hasImageType = /^(badge|poster|competition)\//i.test(cleanAsset);
  const imagePath = type && !hasImageType && !cleanAsset.includes("/") ? `${type}/${cleanAsset}` : cleanAsset;
  return `${STREAMED_IMAGE_BASE_URL.replace(/\/+$/, "")}/${imagePath}`;
}


function normalizeTeam(value: unknown): StreamedTeam | null {
  if (!isObject(value)) return null;
  const name = asString(value.name) ?? asString(value.title);
  if (!name) return null;
  return {
    id: asString(value.id) ?? asString(value.slug),
    name,
    badge: imageUrl(asImageAsset(value.badge) ?? asImageAsset(value.logo) ?? asImageAsset(value.image), "badge")
  };
}

function normalizeSource(value: unknown): StreamedSource | null {
  if (!isObject(value)) return null;
  const source = asString(value.source) ?? asString(value.name) ?? asString(value.provider);
  const id = asString(value.id) ?? asString(value.sourceId) ?? asString(value.streamId);
  return source && id ? { source, id } : null;
}

function normalizeMatch(value: unknown, liveOverride?: boolean): StreamedMatch | null {
  if (!isObject(value)) return null;
  const id = asString(value.id) ?? asString(value.matchId) ?? asString(value.slug);
  const title = asString(value.title) ?? asString(value.name);
  if (!id || !title) return null;

  const teams = unwrapArray(value.teams).map(normalizeTeam).filter((team): team is StreamedTeam => team !== null);
  const sources = unwrapArray(value.sources).map(normalizeSource).filter((source): source is StreamedSource => source !== null);
  const competitionObject = isObject(value.competition) ? value.competition : undefined;
  const categoryObject = isObject(value.category) ? value.category : undefined;

  return {
    id,
    title,
    category: asString(value.category) ?? asString(categoryObject?.name),
    competition: asString(value.competition) ?? asString(competitionObject?.name) ?? asString(value.league),
    sport: asString(value.sport) ?? asString(value.sportId) ?? asString(value.category),
    date: asString(value.date) ?? asString(value.startsAt) ?? asString(value.time),
    poster: (() => {
      const posterAsset = asImageAsset(value.poster) ?? asImageAsset(value.image) ?? asImageAsset(value.thumbnail) ?? asImageAsset(competitionObject?.poster);
      return posterAsset ? imageUrl(posterAsset, "poster") : undefined;
    })(),
    badge: asImageAsset(value.badge),
    popular: asBoolean(value.popular) ?? asBoolean(value.isPopular),
    teams,
    sources,
    live: liveOverride ?? asBoolean(value.live) ?? asBoolean(value.isLive)
  };
}

function normalizeQuality(...values: unknown[]): string | undefined {
  const quality = values.map(asString).find(Boolean);
  if (!quality) return undefined;
  const normalized = quality.toLowerCase();
  if (normalized.includes("hd") || normalized.includes("1080") || normalized.includes("720")) return "HD";
  if (normalized.includes("sd") || normalized.includes("480") || normalized.includes("360")) return "SD";
  return undefined;
}

function normalizeLanguage(...values: unknown[]): string | undefined {
  const aliases: Record<string, string> = {
    en: "English",
    eng: "English",
    english: "English",
    es: "Spanish",
    spa: "Spanish",
    spanish: "Spanish",
    ar: "Arabic",
    ara: "Arabic",
    arabic: "Arabic",
    fr: "French",
    french: "French",
    de: "German",
    german: "German",
    it: "Italian",
    italian: "Italian",
    pt: "Portuguese",
    portuguese: "Portuguese",
    hi: "Hindi",
    hindi: "Hindi",
    ta: "Tamil",
    tamil: "Tamil",
    ur: "Urdu",
    urdu: "Urdu"
  };
  const rawValues = values.map(asString).filter((value): value is string => Boolean(value));
  for (const value of rawValues) {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
    if (aliases[normalized]) return aliases[normalized];
  }
  const text = rawValues.join(" ").toLowerCase();
  return Object.entries(aliases).find(([alias]) => text.includes(alias))?.[1];
}

function normalizeStreamNumber(value: unknown): number | undefined {
  const numeric = asNumber(value);
  if (numeric) return numeric;
  const text = asString(value);
  if (!text) return undefined;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function normalizeStream(value: unknown, index: number): StreamedStream | null {
  if (!isObject(value)) return null;
  const embedUrl = asString(value.embedUrl) ?? asString(value.url) ?? asString(value.stream) ?? asString(value.link);
  const source = asString(value.source) ?? asString(value.name) ?? "streamed";
  const id = asString(value.id) ?? `${source}-${embedUrl ?? "server"}`;
  if (!embedUrl) return null;
  return {
    id,
    source,
    embedUrl,
    serverName: asString(value.serverName) ?? asString(value.name) ?? source,
    language: normalizeLanguage(value.language, value.lang, value.locale, value.label, value.serverName, value.name, source),
    quality: normalizeQuality(value.quality, value.resolution, value.label, value.serverName, value.name, source),
    streamNumber: normalizeStreamNumber(value.streamNo ?? value.streamNumber ?? value.number ?? value.server) ?? index + 1,
    raw: value
  };
}

function formatDateLabel(date?: string): string {
  if (!date) return "Upcoming";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}
function isFifaWorldCupMatch(match: StreamedMatch): boolean {
  const fields = [match.title, match.competition, match.category, match.sport].map(normalizeTerm);
  const combined = fields.filter(Boolean).join(" ");
  return combined.includes("world cup") && (combined.includes("fifa") || combined.includes("football") || combined.includes("soccer") || combined.includes("2026"));
}


function toLiveFootballCard(match: StreamedMatch): MatchCardView {
  const firstSource = match.sources[0];
  const slug = createMatchSlug(match.title);
  return {
    id: match.id,
    slug,
    title: match.title,
    competition: match.competition ?? match.category ?? match.sport ?? "NJ Sports",
    meta: match.live ? "Live now" : formatDateLabel(match.date),
    image: liveFootballThumbnail,
    thumbnail: liveFootballThumbnail,
    live: match.live,
    teams: match.teams,
    sources: match.sources,
    watchSource: firstSource?.source,
    watchId: firstSource?.id,
    href: firstSource ? `/watch/${slug}` : undefined
  };
}
export function toMatchCard(match: StreamedMatch): MatchCardView {
  const firstSource = match.sources[0];
  const slug = createMatchSlug(match.title);
  const useWorldCupImage = isFifaWorldCupMatch(match);
  const thumbnail = useWorldCupImage ? liveFootballThumbnail : match.poster ?? match.teams[0]?.badge ?? fallbackImage;
  return {
    id: match.id,
    slug,
    title: match.title,
    competition: match.competition ?? match.category ?? match.sport ?? "NJ Sports",
    meta: match.live ? "Live now" : formatDateLabel(match.date),
    image: thumbnail,
    thumbnail,
    live: match.live,
    badge: match.live ? "Live" : match.popular ? "Popular" : "HD",
    popularity: match.popular ? 1 : asNumber((match as unknown as JsonObject).popularity),
    teams: match.teams,
    sources: match.sources,
    watchSource: firstSource?.source,
    watchId: firstSource?.id,
    href: firstSource ? `/watch/${slug}` : undefined,
    imageFallback: useWorldCupImage ? liveFootballThumbnail : undefined
  };
}


export async function getLiveMatches(): Promise<StreamedMatch[]> {
  const json = await requestJson<unknown>("/matches/live");
  return onlyFootball(unwrapArray(json).map((item) => normalizeMatch(item, true)).filter((match): match is StreamedMatch => match !== null));
}

export async function getTodayMatches(): Promise<StreamedMatch[]> {
  const json = await requestJson<unknown>("/matches/all-today");
  return onlyFootball(unwrapArray(json).map((item) => normalizeMatch(item)).filter((match): match is StreamedMatch => match !== null));
}

export async function getAllMatches(): Promise<StreamedMatch[]> {
  const json = await requestJson<unknown>("/matches/all");
  return onlyFootball(unwrapArray(json).map((item) => normalizeMatch(item)).filter((match): match is StreamedMatch => match !== null));
}

function streamExperienceScore(stream: StreamedStream): number {
  let score = 0;
  if (stream.language) score += 8;
  if (stream.quality === "HD") score += 5;
  if (stream.quality === "SD") score += 2;
  const rawName = `${stream.serverName} ${stream.source}`.toLowerCase();
  if (/admin|echo|test|unknown/.test(rawName)) score -= 6;
  return score;
}

export async function getStreams(source: string, id: string): Promise<StreamedStream[]> {
  const json = await requestJson<unknown>(`/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`);
  if (process.env.NODE_ENV === "development") {
    console.info("[streamed.pk] complete stream response", { source, id, response: json });
  }
  return unwrapArray(json)
    .map(normalizeStream)
    .filter((stream): stream is StreamedStream => stream !== null)
    .map((stream, index) => ({ stream, index }))
    .sort((a, b) => streamExperienceScore(b.stream) - streamExperienceScore(a.stream) || a.index - b.index)
    .map(({ stream }, index) => ({ ...stream, streamNumber: index + 1 }));
}

function uniqueMatches(matches: StreamedMatch[]): StreamedMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

export function createLiveFootballCards(live: StreamedMatch[], today: StreamedMatch[], upcoming: StreamedMatch[], minimumCount = 5): MatchCardView[] {
  const liveMatches = uniqueMatches(live);
  const liveIds = new Set(liveMatches.map((match) => match.id));
  const upcomingMatches = uniqueMatches([...today, ...upcoming]).filter((match) => !match.live && !liveIds.has(match.id));
  const fillCount = Math.max(0, minimumCount - liveMatches.length);
  return [...liveMatches, ...upcomingMatches.slice(0, fillCount)].map(toLiveFootballCard);
}
export function createRows(live: StreamedMatch[], today: StreamedMatch[], upcoming: StreamedMatch[]): ContentRowView[] {
  return [
    { title: "Live Football", items: createLiveFootballCards(live, today, upcoming) },
    { title: "Football Highlights", items: [...today, ...upcoming].map(toMatchCard) }
  ].filter((row) => row.items.length > 0);
}

export function pickHeroMatches(live: StreamedMatch[], today: StreamedMatch[], upcoming: StreamedMatch[]): MatchCardView[] {
  const candidates = uniqueMatches([...live, ...today, ...upcoming]);
  const seen = new Set<string>();
  return candidates.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  }).slice(0, 5).map(toMatchCard);
}

export function searchCatalog(query: string, matches: StreamedMatch[]): SearchResult[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];

  const results: SearchResult[] = [];
  const competitions = new Set<string>();
  for (const match of matches) {
    const card = toMatchCard(match);
    if (match.title.toLowerCase().includes(term)) results.push({ id: `match-${match.id}`, label: match.title, type: "Match", href: card.href });
    if (match.competition && match.competition.toLowerCase().includes(term) && !competitions.has(match.competition)) {
      competitions.add(match.competition);
      results.push({ id: `competition-${match.competition}`, label: match.competition, type: "Competition" });
    }
    for (const team of match.teams) {
      if (team.name.toLowerCase().includes(term)) results.push({ id: `team-${match.id}-${team.name}`, label: team.name, type: "Team", href: card.href });
    }
  }

  return results.slice(0, 8);
}















