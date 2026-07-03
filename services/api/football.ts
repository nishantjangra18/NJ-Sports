export type FootballScoreStatus = "LIVE" | "HT" | "FT" | "UPCOMING" | "UNKNOWN";

export type NormalizedFootballTeam = {
  id?: string;
  name: string;
  shortName: string;
  logo?: string;
  record?: string;
};

export type NormalizedFootballScore = {
  id: string;
  fixtureId: string;
  leagueKey: string;
  competition: string;
  competitionSlug: string;
  competitionLogo?: string;
  round?: string;
  status: FootballScoreStatus;
  statusText: string;
  minute?: string;
  kickoffTime?: string;
  kickoffTimestamp?: string;
  venue?: string;
  referee?: string;
  attendance?: string;
  homeTeam: NormalizedFootballTeam;
  awayTeam: NormalizedFootballTeam;
  homeScore: number | null;
  awayScore: number | null;
  isLive: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
};

export type NormalizedFootballStat = {
  label: string;
  home: string | number;
  away: string | number;
};

export type NormalizedFootballTimelineEvent = {
  id: string;
  minute: string;
  type: "goal" | "yellow" | "red" | "substitution" | "var" | "half-time" | "full-time" | "info";
  team?: "home" | "away";
  title: string;
  player?: string;
  assist?: string;
  out?: string;
  in?: string;
  note?: string;
};

export type NormalizedFootballLineup = {
  team: string;
  formation?: string;
  coach?: string;
  startingXI: string[];
  bench: string[];
};

export type NormalizedFootballStanding = {
  team: string;
  logo?: string;
  rank?: string | number;
  played?: string | number;
  wins?: string | number;
  draws?: string | number;
  losses?: string | number;
  points?: string | number;
};

export type NormalizedFootballMatchCenter = {
  score: NormalizedFootballScore;
  stats: NormalizedFootballStat[];
  timeline: NormalizedFootballTimelineEvent[];
  lineups: {
    home: NormalizedFootballLineup;
    away: NormalizedFootballLineup;
  };
  standings: NormalizedFootballStanding[];
  hasStandings: boolean;
  fetchedAt: string;
};

export type FootballScoreboardResponse = {
  matches: NormalizedFootballScore[];
  errors: Array<{
    competition: string;
    competitionSlug: string;
    reason: string;
  }>;
  fetchedAt: string;
};

export type WorldCupMatchStatus = FootballScoreStatus;

export type WorldCupMatch = {
  id: string;
  fixtureId: string;
  homeTeam: NormalizedFootballTeam;
  awayTeam: NormalizedFootballTeam;
  score: {
    home: number | null;
    away: number | null;
  };
  status: WorldCupMatchStatus;
  statusText: string;
  minute?: string;
  kickoffTime?: string;
  kickoffTimestamp?: string;
  venue?: string;
  round?: string;
  competition: string;
  competitionLogo?: string;
  isLive: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
};


export type WorldCupHubResponse = {
  worldCupId: string;
  live: WorldCupMatch[];
  upcoming: WorldCupMatch[];
  finished: WorldCupMatch[];
  all: WorldCupMatch[];
  errors: FootballScoreboardResponse["errors"];
  fetchedAt: string;
};

type JsonObject = Record<string, unknown>;

type ApiFootballTeam = {
  id?: number | string;
  name?: string;
  logo?: string;
};

type ApiFootballFixture = {
  fixture?: {
    id?: number | string;
    date?: string;
    referee?: string | null;
    status?: {
      long?: string;
      short?: string;
      elapsed?: number | null;
    };
    venue?: {
      name?: string | null;
      city?: string | null;
    };
  };
  league?: {
    id?: number | string;
    name?: string;
    logo?: string;
    round?: string;
  };
  teams?: {
    home?: ApiFootballTeam;
    away?: ApiFootballTeam;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  score?: {
    fulltime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type ApiFootballStatistic = {
  team?: ApiFootballTeam;
  statistics?: Array<{
    type?: string;
    value?: string | number | null;
  }>;
};

type ApiFootballLineup = {
  team?: ApiFootballTeam;
  formation?: string;
  coach?: {
    name?: string;
  };
  startXI?: Array<{
    player?: {
      name?: string;
      number?: number | string;
      pos?: string;
    };
  }>;
  substitutes?: Array<{
    player?: {
      name?: string;
      number?: number | string;
      pos?: string;
    };
  }>;
};

type ApiFootballEvent = {
  time?: {
    elapsed?: number | string;
    extra?: number | string | null;
  };
  team?: ApiFootballTeam;
  player?: {
    name?: string;
  };
  assist?: {
    name?: string;
  };
  type?: string;
  detail?: string;
  comments?: string | null;
};

const apiFootballHost = process.env.API_FOOTBALL_HOST ?? "v3.football.api-sports.io";
const apiFootballBaseUrl = `https://${apiFootballHost}`;
const oneDayMs = 24 * 60 * 60 * 1000;
const twoDaysMs = 2 * oneDayMs;
const WORLD_CUP_LEAGUE_ID = "1";
const WORLD_CUP_SEASON = "2026";
const liveStatusCodes = new Set(["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const finishedStatusCodes = new Set(["FT", "AET", "PEN"]);
const priorityLeagueIds = new Map<string, number>([
  ["1", 0],
  ["2", 10],
  ["39", 20],
  ["140", 21],
  ["135", 22],
  ["78", 23],
  ["61", 24],
  ["3", 30],
  ["13", 31],
  ["4", 40],
  ["5", 41],
  ["10", 42],
  ["15", 43]
]);

const allowedLeagueIds = new Set(Array.from(priorityLeagueIds.keys()));

const priorityLeaguePatterns: Array<{ pattern: RegExp; priority: number }> = [
  { pattern: /\bfifa\s+world\s+cup\b/i, priority: 0 },
  { pattern: /\bworld\s+cup\b/i, priority: 0 },
  { pattern: /\buefa\s+champions\s+league\b/i, priority: 10 },
  { pattern: /\bchampions\s+league\b/i, priority: 10 },
  { pattern: /\bpremier\s+league\b/i, priority: 20 },
  { pattern: /\bla\s+liga\b|\bprimera\s+division\b/i, priority: 21 },
  { pattern: /\bserie\s+a\b/i, priority: 22 },
  { pattern: /\bbundesliga\b/i, priority: 23 },
  { pattern: /\bligue\s+1\b/i, priority: 24 },
  { pattern: /\beuropa\s+league\b/i, priority: 30 },
  { pattern: /\bcopa\s+libertadores\b|\blibertadores\b/i, priority: 31 },
  { pattern: /\beuro\b|\beuropean\s+championship\b/i, priority: 40 },
  { pattern: /\bnations\s+league\b/i, priority: 41 },
  { pattern: /\binternational\b/i, priority: 42 }
];

const blockedCompetitionPattern = /\b(friendlies?|club\s+friendlies?|serie\s+b|serie\s+c|brasileirao\s+serie\s+[bc]|brasileir[a�]o\s+serie\s+[bc]|syrian\s+premier\s+league|u-?\d{2}|under\s?\d{2}|youth|academy|reserve|reserves|junior|juniors|primavera|sub-?\d{2})\b/i;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-") || "api-football";
}

function stableHash(value: unknown): string {
  const input = (() => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  })();
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateOffset(offsetDays: number): Date {
  const date = startOfLocalDay(new Date());
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function formatApiFootballDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayOffsetFromTimestamp(timestamp?: string): number {
  const parsed = Date.parse(timestamp ?? "");
  if (Number.isNaN(parsed)) return Number.MAX_SAFE_INTEGER;
  const matchDay = startOfLocalDay(new Date(parsed)).getTime();
  const today = startOfLocalDay(new Date()).getTime();
  return Math.round((matchDay - today) / oneDayMs);
}

function formatKickoffTime(date?: string): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function normalizeTeam(team: ApiFootballTeam | undefined, fallback: string): NormalizedFootballTeam {
  const name = asString(team?.name) ?? fallback;
  return {
    id: asString(team?.id),
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    logo: asString(team?.logo)
  };
}
const countryFlagCodes: Record<string, string> = {
  algeria: "dz",
  argentina: "ar",
  austria: "at",
  belgium: "be",
  brazil: "br",
  canada: "ca",
  "cabo verde": "cv",
  colombia: "co",
  "congo dr": "cd",
  croatia: "hr",
  "cote divoire": "ci",
  "cote d ivoire": "ci",
  ecuador: "ec",
  egypt: "eg",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  ghana: "gh",
  "ir iran": "ir",
  iraq: "iq",
  japan: "jp",
  jordan: "jo",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  "new zealand": "nz",
  norway: "no",
  panama: "pa",
  paraguay: "py",
  portugal: "pt",
  "saudi arabia": "sa",
  senegal: "sn",
  "south africa": "za",
  spain: "es",
  sweden: "se",
  turkiye: "tr",
  usa: "us",
  uruguay: "uy",
  uzbekistan: "uz"
};

function normalizedCountryKey(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countryFlagLogo(name: string) {
  const code = countryFlagCodes[normalizedCountryKey(name)];
  return code ? `https://media.api-sports.io/flags/${code}.svg` : undefined;
}

function worldCupTeam(name: string): NormalizedFootballTeam {
  return {
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    logo: countryFlagLogo(name)
  };
}

function normalizeStatus(fixture: ApiFootballFixture): {
  status: FootballScoreStatus;
  statusText: string;
  minute?: string;
  isLive: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
} {
  const status = fixture.fixture?.status;
  const code = asString(status?.short)?.toUpperCase();
  const long = asString(status?.long);
  const lowered = long?.toLowerCase() ?? "";
  const elapsed = asNumber(status?.elapsed);
  const dateOffsetValue = dayOffsetFromTimestamp(fixture.fixture?.date);
  const isLive = Boolean(
    (code && liveStatusCodes.has(code)) ||
    lowered.includes("live") ||
    lowered.includes("progress") ||
    lowered.includes("1st half") ||
    lowered.includes("2nd half")
  );
  const isFinished = Boolean(code && finishedStatusCodes.has(code));
  const isUpcoming = !isLive && !isFinished && dateOffsetValue >= 0;

  if (isLive) {
    return {
      status: code === "HT" ? "HT" : "LIVE",
      statusText: long ?? code ?? "LIVE",
      minute: code === "HT" ? "HT" : elapsed ? `${elapsed}'` : "LIVE",
      isLive: true,
      isUpcoming: false,
      isFinished: false
    };
  }

  if (isFinished) {
    return {
      status: "FT",
      statusText: long ?? code ?? "FT",
      isLive: false,
      isUpcoming: false,
      isFinished: true
    };
  }

  return {
    status: isUpcoming ? "UPCOMING" : "UNKNOWN",
    statusText: long ?? code ?? "UPCOMING",
    isLive: false,
    isUpcoming,
    isFinished: false
  };
}

function normalizeFixture(value: unknown, fallbackSeed: string): NormalizedFootballScore | null {
  if (!isObject(value)) return null;
  const fixture = value as ApiFootballFixture;
  const status = normalizeStatus(fixture);
  const rawId = asString(fixture.fixture?.id);
  const id = rawId ?? `api-football-${stableHash({ fallbackSeed, fixture })}`;
  const competition = asString(fixture.league?.name) ?? "Football";
  const homeTeam = normalizeTeam(fixture.teams?.home, "TBD");
  const awayTeam = normalizeTeam(fixture.teams?.away, "TBD");
  const homeScore = fixture.goals?.home ?? fixture.score?.fulltime?.home ?? null;
  const awayScore = fixture.goals?.away ?? fixture.score?.fulltime?.away ?? null;
  const venue = [asString(fixture.fixture?.venue?.name), asString(fixture.fixture?.venue?.city)].filter(Boolean).join(", ") || undefined;

  return {
    id,
    fixtureId: id,
    leagueKey: asString(fixture.league?.id) ?? slugify(competition),
    competition,
    competitionSlug: slugify(competition),
    competitionLogo: asString(fixture.league?.logo),
    round: asString(fixture.league?.round),
    status: status.status,
    statusText: status.statusText,
    minute: status.minute,
    kickoffTime: formatKickoffTime(fixture.fixture?.date),
    kickoffTimestamp: fixture.fixture?.date,
    venue,
    referee: asString(fixture.fixture?.referee),
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    isLive: status.isLive,
    isUpcoming: status.isUpcoming,
    isFinished: status.isFinished
  };
}

function apiFootballHeaders(): HeadersInit {
  const apiSportsKey = process.env.FOOTBALL_API_KEY ?? process.env.API_FOOTBALL_KEY ?? process.env.APIFOOTBALL_API_KEY ?? process.env.API_SPORTS_KEY;
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (apiSportsKey) headers["x-apisports-key"] = apiSportsKey;
  if (rapidApiKey) {
    headers["x-rapidapi-key"] = rapidApiKey;
    headers["x-rapidapi-host"] = apiFootballHost;
  }

  return headers;
}

async function requestApiFootball(endpoint: string, params: Record<string, string>, retries = 2): Promise<JsonObject> {
  const url = new URL(endpoint, apiFootballBaseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url.toString(), {
        headers: apiFootballHeaders(),
        next: { revalidate: 300 }
      });
      console.log("API-Football response status:", response.status);
      if (!response.ok) throw new Error(`API-Football returned ${response.status}`);
      const json = (await response.json()) as unknown;
      return isObject(json) ? json : {};
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("API-Football request failed");
}

async function fetchFixtureSet(label: string, params: Record<string, string>): Promise<NormalizedFootballScore[]> {
  const json = await requestApiFootball("/fixtures", params);
  const response = getArray(json.response);
  console.log(`API-Football ${label}:`, response.length);
  return response.flatMap((fixture, index) => {
    const normalized = normalizeFixture(fixture, `${label}-${index}`);
    return normalized ? [normalized] : [];
  });
}

function competitionSearchText(match: NormalizedFootballScore) {
  return `${match.competition} ${match.competitionSlug} ${match.leagueKey}`;
}

function leaguePriority(match: NormalizedFootballScore): number {
  const idPriority = priorityLeagueIds.get(match.leagueKey);
  if (idPriority !== undefined) return idPriority;

  const text = competitionSearchText(match);
  for (const item of priorityLeaguePatterns) {
    if (item.pattern.test(text)) return item.priority;
  }

  return 1000;
}

function isPriorityLeague(match: NormalizedFootballScore) {
  return leaguePriority(match) < 1000;
}

function isAllowedLeague(match: NormalizedFootballScore) {
  if (allowedLeagueIds.has(match.leagueKey)) return true;
  return isPriorityLeague(match);
}

function applyLeagueQualityFilter(matches: NormalizedFootballScore[]) {
  return matches.filter((match) => isAllowedLeague(match) && !blockedCompetitionPattern.test(competitionSearchText(match)));
}
function groupRank(match: NormalizedFootballScore): number {
  const priority = leaguePriority(match);
  if (priority <= 0) return 0;
  if (priority < 20) return 1;
  if (priority < 30) return 2;
  if (priority < 1000) return 3;
  return 4;
}

function sortScores(matches: NormalizedFootballScore[]) {
  return [...matches].sort((a, b) => {
    const rankDelta = groupRank(a) - groupRank(b);
    if (rankDelta !== 0) return rankDelta;

    const priorityDelta = leaguePriority(a) - leaguePriority(b);
    if (priorityDelta !== 0) return priorityDelta;

    const aTime = Date.parse(a.kickoffTimestamp ?? "");
    const bTime = Date.parse(b.kickoffTimestamp ?? "");
    const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
    const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;

    if (a.isFinished && b.isFinished) return safeB - safeA;
    return safeA - safeB;
  });
}

function withinScoreWindow(match: NormalizedFootballScore) {
  if (match.isLive) return true;

  const timestamp = Date.parse(match.kickoffTimestamp ?? "");
  if (Number.isNaN(timestamp)) return false;

  const now = Date.now();
  const todayStart = startOfLocalDay(new Date()).getTime();
  const todayEnd = todayStart + oneDayMs;
  const isToday = timestamp >= todayStart && timestamp < todayEnd;
  if (isToday) return true;
  if (match.isUpcoming) return timestamp > now && timestamp <= now + twoDaysMs;
  if (match.isFinished) return timestamp >= now - twoDaysMs && timestamp <= now;
  return false;
}
function mergeScores(matches: NormalizedFootballScore[]) {
  const byId = new Map<string, NormalizedFootballScore>();
  const withoutStableId: NormalizedFootballScore[] = [];

  for (const match of matches) {
    if (/^api-football-[a-z0-9]+$/i.test(match.id)) {
      withoutStableId.push(match);
      continue;
    }
    byId.set(match.id, match);
  }

  return sortScores([...byId.values(), ...withoutStableId]);
}

function isWorldCupFixture(match: NormalizedFootballScore) {
  const leagueText = `${match.competition} ${match.competitionSlug}`.toLowerCase();
  return match.leagueKey === WORLD_CUP_LEAGUE_ID || leagueText.includes("world cup");
}

function toWorldCupMatch(match: NormalizedFootballScore): WorldCupMatch {
  return {
    id: match.fixtureId,
    fixtureId: match.fixtureId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score: {
      home: match.homeScore,
      away: match.awayScore
    },
    status: match.status,
    statusText: match.statusText,
    minute: match.minute,
    kickoffTime: match.kickoffTime,
    kickoffTimestamp: match.kickoffTimestamp,
    venue: match.venue,
    round: match.round,
    competition: match.competition || "FIFA World Cup",
    competitionLogo: match.competitionLogo,
    isLive: match.isLive,
    isUpcoming: match.isUpcoming,
    isFinished: match.isFinished
  };
}
function fromWorldCupMatch(match: WorldCupMatch): NormalizedFootballScore {
  return {
    id: match.id,
    fixtureId: match.fixtureId,
    leagueKey: WORLD_CUP_LEAGUE_ID,
    competition: match.competition || "World Cup",
    competitionSlug: "fifa-world-cup",
    competitionLogo: match.competitionLogo,
    round: match.round,
    status: match.status,
    statusText: match.statusText,
    minute: match.minute,
    kickoffTime: match.kickoffTime,
    kickoffTimestamp: match.kickoffTimestamp,
    venue: match.venue,
    homeTeam: { ...match.homeTeam, logo: match.homeTeam.logo ?? countryFlagLogo(match.homeTeam.name) },
    awayTeam: { ...match.awayTeam, logo: match.awayTeam.logo ?? countryFlagLogo(match.awayTeam.name) },
    homeScore: match.score.home,
    awayScore: match.score.away,
    isLive: match.isLive,
    isUpcoming: match.isUpcoming,
    isFinished: match.isFinished
  };
}

function worldCupStatusRank(match: WorldCupMatch) {
  if (match.isLive) return 0;
  if (match.status === "HT") return 1;
  if (match.isFinished) return 2;
  if (match.isUpcoming) return 3;
  return 4;
}

function sortWorldCupMatches(matches: WorldCupMatch[]) {
  return [...matches].sort((a, b) => {
    const rankDelta = worldCupStatusRank(a) - worldCupStatusRank(b);
    if (rankDelta !== 0) return rankDelta;
    const aTime = Date.parse(a.kickoffTimestamp ?? "");
    const bTime = Date.parse(b.kickoffTimestamp ?? "");
    const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
    const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
    if (a.isFinished && b.isFinished) return safeB - safeA;
    return safeA - safeB;
  });
}

function dedupeWorldCupMatches(matches: WorldCupMatch[]) {
  const byFixtureId = new Map<string, WorldCupMatch>();
  for (const match of matches) {
    byFixtureId.set(match.fixtureId, match);
  }
  return sortWorldCupMatches([...byFixtureId.values()]);
}
function decodeWorldCupTitle(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWorldCupHighlightMatch(value: unknown): WorldCupMatch | null {
  if (!isObject(value)) return null;
  const rawTitle = asString(value.title);
  const publishedAt = asString(value.publishedAt);
  const id = asString(value.id) ?? `world-cup-cache-${stableHash(value)}`;
  if (!rawTitle || !publishedAt) return null;

  const title = decodeWorldCupTitle(rawTitle);
  const matchText = title.replace(/^Highlights\s*\|\s*/i, "").replace(/\s*\|\s*FIFA World Cup.*$/i, "").trim();
  const match = matchText.match(/^(.+?)\s+(?:\(\d+\))?(\d+)\s*-\s*(\d+)(?:\(\d+\))?\s+(.+)$/);
  if (!match) return null;

  const homeTeam = match[1].trim();
  const awayTeam = match[4].trim();

  return {
    id,
    fixtureId: id,
    homeTeam: worldCupTeam(homeTeam),
    awayTeam: worldCupTeam(awayTeam),
    score: { home: Number(match[2]), away: Number(match[3]) },
    status: "FT",
    statusText: "Full Time",
    kickoffTime: formatKickoffTime(publishedAt),
    kickoffTimestamp: publishedAt,
    venue: "FIFA World Cup",
    competition: "World Cup",
    isLive: false,
    isUpcoming: false,
    isFinished: true
  };
}

function seededWorldCupFixtures(): WorldCupMatch[] {
  return [
    {
      id: "world-cup-cache-usa-bih-2026-07-02",
      fixtureId: "world-cup-cache-usa-bih-2026-07-02",
      homeTeam: { name: "USA", shortName: "USA", logo: "https://media.api-sports.io/flags/us.svg" },
      awayTeam: { name: "Bosnia & Herzegovina", shortName: "BIH", logo: "https://media.api-sports.io/flags/ba.svg" },
      score: { home: 2, away: 0 },
      status: "FT",
      statusText: "Full Time",
      kickoffTime: formatKickoffTime("2026-07-02T00:00:00.000Z"),
      kickoffTimestamp: "2026-07-02T00:00:00.000Z",
      venue: "Levi's Stadium, San Francisco",
      competition: "World Cup",
      isLive: false,
      isUpcoming: false,
      isFinished: true
    },
    {
      id: "world-cup-cache-spain-austria-2026-07-03",
      fixtureId: "world-cup-cache-spain-austria-2026-07-03",
      homeTeam: { name: "Spain", shortName: "ESP", logo: "https://media.api-sports.io/flags/es.svg" },
      awayTeam: { name: "Austria", shortName: "AUT", logo: "https://media.api-sports.io/flags/at.svg" },
      score: { home: null, away: null },
      status: "UPCOMING",
      statusText: "Not Started",
      kickoffTime: formatKickoffTime("2026-07-02T19:00:00.000Z"),
      kickoffTimestamp: "2026-07-02T19:00:00.000Z",
      venue: "SoFi Stadium, Los Angeles",
      competition: "World Cup",
      isLive: false,
      isUpcoming: true,
      isFinished: false
    },
    {
      id: "world-cup-cache-portugal-croatia-2026-07-03",
      fixtureId: "world-cup-cache-portugal-croatia-2026-07-03",
      homeTeam: { name: "Portugal", shortName: "POR", logo: "https://media.api-sports.io/flags/pt.svg" },
      awayTeam: { name: "Croatia", shortName: "CRO", logo: "https://media.api-sports.io/flags/hr.svg" },
      score: { home: null, away: null },
      status: "UPCOMING",
      statusText: "Not Started",
      kickoffTime: formatKickoffTime("2026-07-02T23:00:00.000Z"),
      kickoffTimestamp: "2026-07-02T23:00:00.000Z",
      venue: "BMO Field, Toronto",
      competition: "World Cup",
      isLive: false,
      isUpcoming: true,
      isFinished: false
    }
  ];
}

async function getWorldCupFallbackMatches(): Promise<WorldCupMatch[]> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const cachePath = path.join(process.cwd(), "data", "highlight-cache", "official-highlights.json");
    const json = JSON.parse(await fs.readFile(cachePath, "utf8")) as JsonObject;
    const cached = getArray(json.highlights)
      .map(parseWorldCupHighlightMatch)
      .filter((match): match is WorldCupMatch => Boolean(match));
    return dedupeWorldCupMatches([...seededWorldCupFixtures(), ...cached]);
  } catch (error) {
    console.warn("World Cup fallback failed", error);
    return seededWorldCupFixtures();
  }
}
async function fetchWorldCupFixtureCandidates(errors: FootballScoreboardResponse["errors"]): Promise<NormalizedFootballScore[]> {
  const windowRequests = [-2, -1, 0, 1, 2].map((offset) => {
    const date = formatApiFootballDate(dateOffset(offset));
    return { label: `world-cup-${date}`, params: { league: WORLD_CUP_LEAGUE_ID, date } };
  });

  const requests: Array<{ label: string; params: Record<string, string> }> = [
    { label: "world-cup-season", params: { league: WORLD_CUP_LEAGUE_ID, season: WORLD_CUP_SEASON } },
    ...windowRequests,
    { label: "world-cup-live-fallback", params: { live: "all" } },
    { label: "world-cup-next", params: { league: WORLD_CUP_LEAGUE_ID, next: "50" } }
  ];

  const results = await Promise.allSettled(requests.map((request) => fetchFixtureSet(request.label, request.params)));
  const fixtures: NormalizedFootballScore[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      fixtures.push(...result.value.filter(isWorldCupFixture));
      return;
    }

    errors.push({
      competition: `API-Football ${requests[index].label}`,
      competitionSlug: "api-football-world-cup",
      reason: result.reason instanceof Error ? result.reason.message : "Unable to load World Cup fixtures"
    });
  });

  const byFixtureId = new Map<string, NormalizedFootballScore>();
  for (const fixture of fixtures) {
    byFixtureId.set(fixture.fixtureId, fixture);
  }

  return [...byFixtureId.values()];
}

export async function getWorldCup2026Fixtures(): Promise<WorldCupHubResponse> {
  const errors: FootballScoreboardResponse["errors"] = [];
  const normalized = await fetchWorldCupFixtureCandidates(errors);
  const apiMatches = dedupeWorldCupMatches(normalized.map(toWorldCupMatch));
  const all = apiMatches.length > 0 ? apiMatches : await getWorldCupFallbackMatches();
  const live = sortWorldCupMatches(all.filter((match) => match.isLive || match.status === "HT"));
  const upcoming = sortWorldCupMatches(all.filter((match) => match.isUpcoming));
  const finished = sortWorldCupMatches(all.filter((match) => match.isFinished));

  console.log("API-Football World Cup grouped:", {
    all: all.length,
    live: live.length,
    upcoming: upcoming.length,
    finished: finished.length
  });

  return {
    worldCupId: WORLD_CUP_LEAGUE_ID,
    live,
    upcoming,
    finished,
    all,
    errors,
    fetchedAt: new Date().toISOString()
  };
}
export async function getFootballScoreboard(): Promise<FootballScoreboardResponse> {
  const requests: Array<{ label: string; params: Record<string, string> }> = [
    { label: "live", params: { live: "all" } },
    ...[-2, -1, 0, 1, 2].map((offset) => {
      const date = formatApiFootballDate(dateOffset(offset));
      return { label: date, params: { date } };
    })
  ];

  const results = await Promise.allSettled(requests.map((request) => fetchFixtureSet(request.label, request.params)));
  const matches: NormalizedFootballScore[] = [];
  const errors: FootballScoreboardResponse["errors"] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      matches.push(...result.value);
      return;
    }

    errors.push({
      competition: `API-Football ${requests[index].label}`,
      competitionSlug: "api-football",
      reason: result.reason instanceof Error ? result.reason.message : "Unknown API-Football error"
    });
  });

  const windowMatches = matches.filter(withinScoreWindow);
  const qualityMatches = applyLeagueQualityFilter(windowMatches);
  let mergedMatches = mergeScores(qualityMatches);

  if (mergedMatches.length === 0) {
    const fallbackMatches = (await getWorldCupFallbackMatches()).map(fromWorldCupMatch).filter(withinScoreWindow);
    mergedMatches = mergeScores(fallbackMatches);
    console.log("API-Football scoreboard fallback:", { fallback: fallbackMatches.length, merged: mergedMatches.length });
  }

  console.log("API-Football window/quality/merged:", { window: windowMatches.length, quality: qualityMatches.length, merged: mergedMatches.length });
  console.log("API-Football live/upcoming/finished:", {
    live: mergedMatches.filter((match) => match.isLive).length,
    upcoming: mergedMatches.filter((match) => match.isUpcoming).length,
    finished: mergedMatches.filter((match) => match.isFinished).length
  });

  return {
    matches: mergedMatches,
    errors,
    fetchedAt: new Date().toISOString()
  };
}

export async function getFootballMatchCenter(matchId: string): Promise<NormalizedFootballMatchCenter | null> {
  const fixtureId = matchId.trim();
  if (!fixtureId) return null;
  console.log("fixtureId:", fixtureId);

  const fixtureJson = await requestApiFootball("/fixtures", { id: fixtureId });
  const fixture = getArray(fixtureJson.response)[0];
  const score = normalizeFixture(fixture, fixtureId);
  if (!score) return null;

  return {
    score,
    stats: [],
    timeline: [],
    lineups: {
      home: toLineupSide(undefined, score.homeTeam.name),
      away: toLineupSide(undefined, score.awayTeam.name)
    },
    standings: [],
    hasStandings: false,
    fetchedAt: new Date().toISOString()
  };
}

function formatStatisticValue(value: string | number | null | undefined): string | number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return "-";
}

function normalizeStatistics(values: unknown[]): NormalizedFootballStat[] {
  const sides = values.filter(isObject).slice(0, 2) as ApiFootballStatistic[];
  if (sides.length < 2) return [];

  const homeStats = new Map((sides[0].statistics ?? []).map((stat) => [asString(stat.type) ?? "", formatStatisticValue(stat.value)]));
  const awayStats = new Map((sides[1].statistics ?? []).map((stat) => [asString(stat.type) ?? "", formatStatisticValue(stat.value)]));
  const labels = Array.from(new Set([...homeStats.keys(), ...awayStats.keys()])).filter(Boolean);

  return labels.map((label) => ({
    label,
    home: homeStats.get(label) ?? "-",
    away: awayStats.get(label) ?? "-"
  }));
}

function playerName(value: unknown): string | undefined {
  if (!isObject(value)) return undefined;
  const player = value.player;
  if (!isObject(player)) return undefined;
  return asString(player.name);
}

function toLineupSide(lineup: ApiFootballLineup | undefined, fallbackTeam: string): NormalizedFootballLineup {
  return {
    team: asString(lineup?.team?.name) ?? fallbackTeam,
    formation: asString(lineup?.formation),
    coach: asString(lineup?.coach?.name),
    startingXI: (lineup?.startXI ?? []).map(playerName).filter((name): name is string => Boolean(name)),
    bench: (lineup?.substitutes ?? []).map(playerName).filter((name): name is string => Boolean(name))
  };
}

function normalizeLineups(values: unknown[], score: NormalizedFootballScore): NormalizedFootballMatchCenter["lineups"] {
  const lineups = values.filter(isObject) as ApiFootballLineup[];
  const homeLineup = lineups.find((lineup) => asString(lineup.team?.id) === score.homeTeam.id || asString(lineup.team?.name) === score.homeTeam.name) ?? lineups[0];
  const awayLineup = lineups.find((lineup) => asString(lineup.team?.id) === score.awayTeam.id || asString(lineup.team?.name) === score.awayTeam.name) ?? lineups[1];

  return {
    home: toLineupSide(homeLineup, score.homeTeam.name),
    away: toLineupSide(awayLineup, score.awayTeam.name)
  };
}

function normalizeEventType(type?: string, detail?: string): NormalizedFootballTimelineEvent["type"] {
  const text = ((type ?? "") + " " + (detail ?? "")).toLowerCase();
  if (text.includes("goal")) return "goal";
  if (text.includes("yellow")) return "yellow";
  if (text.includes("red")) return "red";
  if (text.includes("subst")) return "substitution";
  if (text.includes("var")) return "var";
  return "info";
}

function normalizeEvents(values: unknown[], score: NormalizedFootballScore): NormalizedFootballTimelineEvent[] {
  return values.filter(isObject).map((value, index) => {
    const event = value as ApiFootballEvent;
    const elapsed = asString(event.time?.elapsed);
    const extra = asString(event.time?.extra);
    const minute = elapsed ? elapsed + (extra ? "+" + extra : "") + "'" : "";
    const detail = asString(event.detail);
    const type = asString(event.type);
    const player = asString(event.player?.name);
    const assist = asString(event.assist?.name);
    const teamId = asString(event.team?.id);

    return {
      id: score.fixtureId + "-" + index,
      minute,
      type: normalizeEventType(type, detail),
      team: teamId && teamId === score.homeTeam.id ? "home" : teamId && teamId === score.awayTeam.id ? "away" : undefined,
      title: detail ?? type ?? "Match event",
      player,
      assist,
      note: asString(event.comments) ?? undefined
    };
  });
}



