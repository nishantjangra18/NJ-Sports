import { connectMongoDB } from "@/lib/db/mongoose";
import { PlayerImageCache } from "@/models/PlayerImageCache";
import { WorldCupStatsSnapshot } from "@/models/WorldCupStatsSnapshot";

type JsonRecord = Record<string, unknown>;

export type WorldCupPlayerStat = {
  rank: number;
  name: string;
  photo: string;
  country: string;
  flag: string;
  goals: number;
  assists: number;
  value: number;
  valueLabel: "Goals" | "Assists";
};

export type WorldCupTeamStat = {
  rank: number;
  teamName: string;
  name: string;
  logo: string;
  goals: number;
};

export type WorldCupWinner = {
  year: number;
  winner: string;
  flag: string;
};

export type WorldCupStatsResponse = {
  topScorers: WorldCupPlayerStat[];
  topAssists: WorldCupPlayerStat[];
  topTeams: WorldCupTeamStat[];
  pastWinners: WorldCupWinner[];
  errors: string[];
  fallbackUsed: boolean;
  fetchedAt: string;
};

const tournamentUrl = process.env.ZAFRONIX_WORLD_CUP_API_URL ?? "https://api.zafronix.com/fifa/worldcup/v1/tournaments/2026";
const tournamentKey = process.env.ZAFRONIX_WORLD_CUP_TOURNAMENT_KEY ?? "fifa-worldcup-2026";
const sourceName = "zafronix";
const defaultImage = "/brand/football-placeholder.svg";
const defaultPlayerAvatar = "/default/player-avatar.png";
const imageCacheTtlMs = Number(process.env.PLAYER_IMAGE_CACHE_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);
const cacheTtlMs = Number(process.env.ZAFRONIX_WORLD_CUP_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
const requestRetries = 1;

const countryFlagCodes: Record<string, string> = {
  argentina: "ar",
  australia: "au",
  belgium: "be",
  brazil: "br",
  canada: "ca",
  colombia: "co",
  croatia: "hr",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  ghana: "gh",
  japan: "jp",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  portugal: "pt",
  senegal: "sn",
  spain: "es",
  switzerland: "ch",
  unitedstates: "us",
  usa: "us",
  uruguay: "uy",
  wales: "gb-wls"
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function getPath(source: unknown, path: string[]) {
  let current = source;
  for (const part of path) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }

    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function firstString(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = asString(getPath(source, path));
    if (value) return value;
  }
  return undefined;
}

function firstNumber(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = asNumber(getPath(source, path));
    if (value) return value;
  }
  return 0;
}

function countryKey(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function flagForCountry(country?: string) {
  if (!country) return defaultImage;
  const code = countryFlagCodes[countryKey(country)];
  return code ? `https://flagcdn.com/w80/${code}.png` : defaultImage;
}

function withRank<T>(items: T[], limit = 5) {
  return items.slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}

function findArrayByKeys(source: unknown, keys: string[], depth = 0): unknown[] | undefined {
  if (depth > 6 || !isRecord(source)) return undefined;

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested = findArrayByKeys(value, keys, depth + 1);
      if (nested) return nested;
    }
  }

  for (const value of Object.values(source)) {
    if (isRecord(value)) {
      const nested = findArrayByKeys(value, keys, depth + 1);
      if (nested) return nested;
    }
  }

  return undefined;
}

function playerImageKey(name: string, country: string) {
  return `${countryKey(name)}-${countryKey(country)}`;
}

function isRemoteUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function isReachableImage(url: string) {
  if (!isRemoteUrl(url)) return true;

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { Accept: "image/*" },
      cache: "no-store"
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && (!contentType || contentType.startsWith("image/"))) return true;
  } catch {
    // Some image hosts reject HEAD; retry with GET below.
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "image/*" },
      cache: "no-store"
    });
    const contentType = response.headers.get("content-type") ?? "";
    return response.ok && (!contentType || contentType.startsWith("image/"));
  } catch {
    return false;
  }
}

async function readCachedPlayerImage(name: string, country: string) {
  try {
    await connectMongoDB();
    const cached = await PlayerImageCache.findOne({
      playerKey: playerImageKey(name, country),
      expiresAt: { $gt: new Date() }
    }).lean();

    return cached?.resolvedUrl;
  } catch (error) {
    console.error("Player image cache read failed", error);
    return undefined;
  }
}

async function writeCachedPlayerImage(name: string, country: string, resolvedUrl: string, source: "api" | "wikipedia" | "default", sourcePhoto?: string) {
  try {
    await connectMongoDB();
    await PlayerImageCache.findOneAndUpdate({
      playerKey: playerImageKey(name, country)
    }, {
      playerKey: playerImageKey(name, country),
      playerName: name,
      country,
      sourcePhoto,
      resolvedUrl,
      source,
      expiresAt: new Date(Date.now() + imageCacheTtlMs)
    }, {
      upsert: true,
      setDefaultsOnInsert: true
    });
  } catch (error) {
    console.error("Player image cache write failed", error);
  }
}

async function wikipediaPlayerThumbnail(name: string) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/\s+/g, "_"))}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 7 * 24 * 60 * 60 }
    });
    if (!response.ok) return undefined;
    const json = await response.json();
    if (!isRecord(json) || !isRecord(json.thumbnail)) return undefined;
    return asString(json.thumbnail.source);
  } catch {
    return undefined;
  }
}

async function resolvePlayerPhoto(stat: WorldCupPlayerStat) {
  const apiPhoto = stat.photo && stat.photo !== defaultImage && stat.photo !== defaultPlayerAvatar ? stat.photo : undefined;

  if (apiPhoto && await isReachableImage(apiPhoto)) {
    await writeCachedPlayerImage(stat.name, stat.country, apiPhoto, "api", apiPhoto);
    return apiPhoto;
  }

  const cached = await readCachedPlayerImage(stat.name, stat.country);
  if (cached) return cached;

  const wikipediaPhoto = await wikipediaPlayerThumbnail(stat.name);
  if (wikipediaPhoto) {
    await writeCachedPlayerImage(stat.name, stat.country, wikipediaPhoto, "wikipedia", apiPhoto);
    return wikipediaPhoto;
  }

  await writeCachedPlayerImage(stat.name, stat.country, defaultPlayerAvatar, "default", apiPhoto);
  return defaultPlayerAvatar;
}

async function resolvePlayerPhotos(stats: WorldCupPlayerStat[]) {
  return Promise.all(stats.map(async (stat) => ({
    ...stat,
    photo: await resolvePlayerPhoto(stat)
  })));
}
function normalizePlayerRecord(item: unknown, valueLabel: "Goals" | "Assists"): WorldCupPlayerStat | null {
  if (!isRecord(item)) return null;

  const player = isRecord(item.player) ? item.player : item;
  const team = isRecord(item.team) ? item.team : undefined;
  const country = firstString(item, [
    ["country"],
    ["nation"],
    ["nationality"],
    ["player", "country"],
    ["player", "nationality"],
    ["team", "country"],
    ["team", "name"]
  ]) ?? "World Cup";
  const name = firstString(item, [
    ["name"],
    ["playerName"],
    ["player_name"],
    ["player", "name"],
    ["athlete", "name"],
    ["athlete", "displayName"]
  ]) ?? "Unknown Player";
  const goals = firstNumber(item, [
    ["goals"],
    ["goal"],
    ["stats", "goals"],
    ["statistics", "goals"],
    ["statistics", "goals", "total"],
    ["statistics", "0", "goals", "total"]
  ]);
  const assists = firstNumber(item, [
    ["assists"],
    ["assist"],
    ["stats", "assists"],
    ["statistics", "assists"],
    ["statistics", "goals", "assists"],
    ["statistics", "0", "goals", "assists"]
  ]);
  const value = valueLabel === "Goals" ? goals : assists;

  if (value <= 0) return null;

  return {
    rank: 0,
    name,
    photo: firstString(item, [["player", "photo"], ["photo"], ["image"], ["avatar"], ["headshot"], ["player", "image"], ["player", "avatar"], ["player", "headshot"], ["player", "logo"]]) ?? defaultPlayerAvatar,
    country,
    flag: firstString(item, [["flag"], ["countryFlag"], ["country_flag"], ["team", "flag"], ["team", "logo"]]) ??
      firstString(team, [["flag"], ["logo"]]) ??
      flagForCountry(country),
    goals,
    assists,
    value,
    valueLabel
  };
}

function squadPlayerCandidates(data: unknown) {
  const teams = findArrayByKeys(data, ["teams"]) ?? [];
  return teams.flatMap((team) => {
    if (!isRecord(team) || !Array.isArray(team.squad)) return [];
    const teamName = firstString(team, [["name"], ["teamName"], ["country"]]) ?? "World Cup";
    const teamFlag = firstString(team, [["flag"], ["logo"]]);
    return team.squad.map((player) => isRecord(player) ? {
      ...player,
      country: teamName,
      flag: teamFlag,
      team: {
        name: teamName,
        flag: teamFlag
      }
    } : player);
  });
}

function playerCandidates(data: unknown, keys: string[]) {
  const direct = findArrayByKeys(data, keys);
  if (direct?.length) return direct;
  const players = findArrayByKeys(data, ["players", "playerStats", "player_stats", "statistics"]);
  if (players?.length) return players;
  return squadPlayerCandidates(data);
}

async function normalizePlayers(data: unknown, keys: string[], valueLabel: "Goals" | "Assists") {
  const ranked = withRank(
    playerCandidates(data, keys)
      .map((item) => normalizePlayerRecord(item, valueLabel))
      .filter((item): item is WorldCupPlayerStat => Boolean(item))
      .sort((a, b) => b.value - a.value),
    valueLabel === "Goals" ? 10 : 5
  );

  return resolvePlayerPhotos(ranked);
}

function normalizeTeamRecord(item: unknown): WorldCupTeamStat | null {
  if (!isRecord(item)) return null;

  const team = isRecord(item.team) ? item.team : item;
  const teamName = firstString(item, [
    ["teamName"],
    ["team_name"],
    ["name"],
    ["team", "name"],
    ["country"]
  ]) ?? "Unknown Team";
  const goals = firstNumber(item, [
    ["goals"],
    ["totalGoals"],
    ["goalsFor"],
    ["goals_for"],
    ["goalsScored"],
    ["goals_scored"],
    ["stats", "goals"],
    ["statistics", "goals"],
    ["statistics", "goals_for"],
    ["statistics", "goals", "for"],
    ["statistics", "goals", "for", "total"],
    ["groupStage", "goalsFor"]
  ]);

  if (goals <= 0) return null;

  return {
    rank: 0,
    teamName,
    name: teamName,
    logo: firstString(item, [["logo"], ["flag"], ["team", "logo"], ["team", "flag"]]) ??
      firstString(team, [["logo"], ["flag"]]) ??
      flagForCountry(teamName),
    goals
  };
}

function fixtureTeamName(match: JsonRecord, side: "home" | "away") {
  return firstString(match, [
    [side, "name"],
    [`${side}Team`, "name"],
    [`${side}_team`, "name"],
    ["teams", side, "name"]
  ]);
}

function fixtureTeamLogo(match: JsonRecord, side: "home" | "away") {
  return firstString(match, [
    [side, "logo"],
    [side, "flag"],
    [`${side}Team`, "logo"],
    [`${side}_team`, "logo"],
    ["teams", side, "logo"]
  ]);
}

function fixtureGoals(match: JsonRecord, side: "home" | "away") {
  return firstNumber(match, [
    [`${side}Score`],
    [`${side}_score`],
    ["score", side],
    ["goals", side],
    ["scores", side],
    ["result", side]
  ]);
}

function deriveTeamsFromMatches(data: unknown) {
  const matches = findArrayByKeys(data, ["matches", "fixtures", "games"]) ?? [];
  const teams = new Map<string, WorldCupTeamStat>();

  for (const match of matches) {
    if (!isRecord(match)) continue;
    for (const side of ["home", "away"] as const) {
      const name = fixtureTeamName(match, side);
      if (!name) continue;
      const key = countryKey(name);
      const current = teams.get(key) ?? {
        rank: 0,
        teamName: name,
        name,
        logo: fixtureTeamLogo(match, side) ?? flagForCountry(name),
        goals: 0
      };
      teams.set(key, { ...current, goals: current.goals + fixtureGoals(match, side) });
    }
  }

  return [...teams.values()].filter((team) => team.goals > 0);
}

function normalizeTeams(data: unknown) {
  const direct = findArrayByKeys(data, ["topTeams", "top_teams", "teamStats", "team_stats", "teams", "standings"]) ?? [];
  const teams = direct
    .map(normalizeTeamRecord)
    .filter((item): item is WorldCupTeamStat => Boolean(item));
  const source = teams.length ? teams : deriveTeamsFromMatches(data);

  return withRank(source.sort((a, b) => b.goals - a.goals));
}

function normalizePastWinners(data: unknown) {
  const winners = findArrayByKeys(data, ["pastWinners", "past_winners", "winners", "history"]) ?? [];
  return winners
    .map((winner) => {
      if (!isRecord(winner)) return null;
      const year = firstNumber(winner, [["year"], ["season"]]);
      const name = firstString(winner, [["winner"], ["champion"], ["team"], ["team", "name"], ["country"]]);
      if (!year || !name) return null;
      return {
        year,
        winner: name,
        flag: firstString(winner, [["flag"], ["logo"], ["team", "flag"], ["team", "logo"]]) ?? flagForCountry(name)
      };
    })
    .filter((winner): winner is WorldCupWinner => Boolean(winner))
    .sort((a, b) => b.year - a.year);
}

async function readCachedSnapshot(allowExpired: boolean) {
  try {
    await connectMongoDB();
    const expiresAtFilter = allowExpired ? {} : { expiresAt: { $gt: new Date() } };
    const snapshot = await WorldCupStatsSnapshot.findOne({
      tournamentKey,
      ...expiresAtFilter
    }).sort({ fetchedAt: -1 }).lean();

    return snapshot?.payload;
  } catch (error) {
    console.error("World Cup stats cache read failed", error);
    return null;
  }
}

async function writeCachedSnapshot(payload: unknown) {
  try {
    await connectMongoDB();
    const fetchedAt = new Date();
    await WorldCupStatsSnapshot.findOneAndUpdate({
      tournamentKey
    }, {
      tournamentKey,
      source: sourceName,
      payload,
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + cacheTtlMs)
    }, {
      upsert: true,
      setDefaultsOnInsert: true
    });
  } catch (error) {
    console.error("World Cup stats cache write failed", error);
  }
}

async function fetchZafronixTournament() {
  const apiKey = process.env.ZAFRONIX_WORLD_CUP_API_KEY;
  if (!apiKey) throw new Error("ZAFRONIX_WORLD_CUP_API_KEY is not configured");

  let lastError: unknown;
  for (let attempt = 0; attempt <= requestRetries; attempt += 1) {
    try {
      const response = await fetch(tournamentUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
          "x-zafronix-api-key": apiKey
        },
        next: { revalidate: Math.floor(cacheTtlMs / 1000) }
      });

      if (!response.ok) throw new Error(`Zafronix World Cup API returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to load Zafronix World Cup data");
}

async function getTournamentSnapshot() {
  const freshCache = await readCachedSnapshot(false);
  if (freshCache) return { data: freshCache, fallbackUsed: false, errors: [] as string[] };

  try {
    const data = await fetchZafronixTournament();
    await writeCachedSnapshot(data);
    return { data, fallbackUsed: false, errors: [] as string[] };
  } catch (error) {
    const cached = await readCachedSnapshot(true);
    if (cached) {
      return {
        data: cached,
        fallbackUsed: true,
        errors: [error instanceof Error ? error.message : "Zafronix World Cup API failed"]
      };
    }
    throw error;
  }
}

export async function getTournamentData() {
  return (await getTournamentSnapshot()).data;
}

export async function getTopScorers() {
  const data = await getTournamentData();
  return normalizePlayers(data, ["topScorers", "top_scorers", "scorers", "goalScorers", "goal_scorers"], "Goals");
}

export async function getTopAssists() {
  const data = await getTournamentData();
  return normalizePlayers(data, ["topAssists", "top_assists", "assists", "assistLeaders", "assist_leaders"], "Assists");
}

export async function getTeamStats() {
  const data = await getTournamentData();
  return normalizeTeams(data);
}

export async function getPastWinners() {
  const data = await getTournamentData();
  return normalizePastWinners(data);
}

export async function getWorldCupStats(): Promise<WorldCupStatsResponse> {
  try {
    const snapshot = await getTournamentSnapshot();
    return {
      topScorers: await normalizePlayers(snapshot.data, ["topScorers", "top_scorers", "scorers", "goalScorers", "goal_scorers"], "Goals"),
      topAssists: [],
      topTeams: [],
      pastWinners: normalizePastWinners(snapshot.data),
      errors: snapshot.errors,
      fallbackUsed: snapshot.fallbackUsed,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      topScorers: [],
      topAssists: [],
      topTeams: [],
      pastWinners: [],
      errors: [error instanceof Error ? error.message : "Unable to load World Cup stats"],
      fallbackUsed: false,
      fetchedAt: new Date().toISOString()
    };
  }
}










