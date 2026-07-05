const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ESPN_LEAGUES = [
  { key: "fifa.world", name: "FIFA World Cup", priority: 0 },
  { key: "uefa.champions", name: "UEFA Champions League", priority: 10 },
  { key: "eng.1", name: "Premier League", priority: 20 },
  { key: "esp.1", name: "La Liga", priority: 21 },
  { key: "ita.1", name: "Serie A", priority: 22 },
  { key: "ger.1", name: "Bundesliga", priority: 23 },
  { key: "fra.1", name: "Ligue 1", priority: 24 },
  { key: "uefa.europa", name: "UEFA Europa League", priority: 30 },
  { key: "conmebol.libertadores", name: "CONMEBOL Libertadores", priority: 31 },
  { key: "usa.1", name: "Major League Soccer", priority: 50 },
  { key: "ksa.1", name: "Saudi Pro League", priority: 51 },
  { key: "mex.1", name: "Liga MX", priority: 52 }
];

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateOffset(offsetDays) {
  const date = startOfLocalDay();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function formatEspnDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function slugify(value) {
  return String(value || "football")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "") || "football";
}

function safeString(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shortName(name) {
  return String(name || "TBD").slice(0, 3).toUpperCase();
}

const teamLogos = {
  "Argentina": "https://flagcdn.com/w80/ar.png",
  "Brazil": "https://flagcdn.com/w80/br.png",
  "England": "https://flagcdn.com/w80/gb-eng.png",
  "France": "https://flagcdn.com/w80/fr.png",
  "Spain": "https://flagcdn.com/w80/es.png",
  "Germany": "https://flagcdn.com/w80/de.png",
  "Italy": "https://flagcdn.com/w80/it.png",
  "Netherlands": "https://flagcdn.com/w80/nl.png",
  "Portugal": "https://flagcdn.com/w80/pt.png",
  "Belgium": "https://flagcdn.com/w80/be.png",
  "Croatia": "https://flagcdn.com/w80/hr.png",
  "Uruguay": "https://flagcdn.com/w80/uy.png",
  "Colombia": "https://flagcdn.com/w80/co.png",
  "Mexico": "https://flagcdn.com/w80/mx.png",
  "United States": "https://flagcdn.com/w80/us.png",
  "USA": "https://flagcdn.com/w80/us.png",
  "India": "https://flagcdn.com/w80/in.png",
  "Japan": "https://flagcdn.com/w80/jp.png",
  "South Korea": "https://flagcdn.com/w80/kr.png",
  "Morocco": "https://flagcdn.com/w80/ma.png",
  "Senegal": "https://flagcdn.com/w80/sn.png",
  "Barcelona": "https://ui-avatars.com/api/?name=Barcelona&background=111111&color=ffffff&bold=true",
  "Real Madrid": "https://ui-avatars.com/api/?name=Real%20Madrid&background=111111&color=ffffff&bold=true",
  "PSG": "https://ui-avatars.com/api/?name=PSG&background=111111&color=ffffff&bold=true",
  "Paris Saint-Germain": "https://ui-avatars.com/api/?name=PSG&background=111111&color=ffffff&bold=true",
  "Manchester City": "https://ui-avatars.com/api/?name=Manchester%20City&background=111111&color=ffffff&bold=true",
  "Man City": "https://ui-avatars.com/api/?name=Manchester%20City&background=111111&color=ffffff&bold=true",
  "Manchester United": "https://ui-avatars.com/api/?name=Manchester%20United&background=111111&color=ffffff&bold=true",
  "Liverpool": "https://ui-avatars.com/api/?name=Liverpool&background=111111&color=ffffff&bold=true",
  "Chelsea": "https://ui-avatars.com/api/?name=Chelsea&background=111111&color=ffffff&bold=true",
  "Arsenal": "https://ui-avatars.com/api/?name=Arsenal&background=111111&color=ffffff&bold=true",
  "Bayern Munich": "https://ui-avatars.com/api/?name=Bayern%20Munich&background=111111&color=ffffff&bold=true",
  "Borussia Dortmund": "https://ui-avatars.com/api/?name=Borussia%20Dortmund&background=111111&color=ffffff&bold=true",
  "Juventus": "https://ui-avatars.com/api/?name=Juventus&background=111111&color=ffffff&bold=true",
  "Inter Milan": "https://ui-avatars.com/api/?name=Inter%20Milan&background=111111&color=ffffff&bold=true",
  "AC Milan": "https://ui-avatars.com/api/?name=AC%20Milan&background=111111&color=ffffff&bold=true",
  "Al Nassr": "https://ui-avatars.com/api/?name=Al%20Nassr&background=111111&color=ffffff&bold=true",
  "Al Hilal": "https://ui-avatars.com/api/?name=Al%20Hilal&background=111111&color=ffffff&bold=true",
  "Al Ittihad": "https://ui-avatars.com/api/?name=Al%20Ittihad&background=111111&color=ffffff&bold=true",
  "Inter Miami": "https://ui-avatars.com/api/?name=Inter%20Miami&background=111111&color=ffffff&bold=true",
  "LA Galaxy": "https://ui-avatars.com/api/?name=LA%20Galaxy&background=111111&color=ffffff&bold=true"
};

function getTeamLogo(teamName) {
  return teamLogos[teamName] || "/brand/football-placeholder.svg";
}

function getEspnTeamLogoUrl(team) {
  const explicitLogo = safeString(team?.logo) || safeString(team?.crest) || safeString(team?.image);
  if (explicitLogo) return explicitLogo;

  if (Array.isArray(team?.logos)) {
    const logo = team.logos.find((item) => safeString(item?.href));
    if (logo) return safeString(logo.href);
  }

  const teamId = safeString(team?.id);
  return teamId ? `https://a.espncdn.com/i/teamlogos/soccer/500/${encodeURIComponent(teamId)}.png` : undefined;
}
function formatKickoffTime(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function normalizeStatus(event) {
  const type = event?.status?.type || {};
  const state = String(type.state || "").toLowerCase();
  const detail = safeString(type.detail) || safeString(event?.status?.displayClock) || safeString(type.description);
  const completed = Boolean(type.completed);
  const clock = safeString(event?.status?.displayClock);

  if (state === "in") {
    const halfTime = /half/i.test(detail || "") || String(type.name || "").toUpperCase() === "STATUS_HALFTIME";
    return {
      status: halfTime ? "HT" : "LIVE",
      statusText: detail || (halfTime ? "Half Time" : "Live"),
      minute: halfTime ? "HT" : clock || "LIVE",
      isLive: true,
      isUpcoming: false,
      isFinished: false
    };
  }

  if (completed || state === "post") {
    return {
      status: "FT",
      statusText: detail || "Full Time",
      isLive: false,
      isUpcoming: false,
      isFinished: true
    };
  }

  return {
    status: "UPCOMING",
    statusText: detail || "Not Started",
    isLive: false,
    isUpcoming: true,
    isFinished: false
  };
}

function normalizeTeam(competitor, fallback) {
  const team = competitor?.team || {};
  const name = safeString(team.displayName) || safeString(team.name) || fallback;
  return {
    id: safeString(team.id) || safeString(competitor?.id),
    name,
    shortName: safeString(team.abbreviation) || shortName(name),
    logo: getEspnTeamLogoUrl(team) || getTeamLogo(name),
    record: Array.isArray(competitor?.records) ? safeString(competitor.records[0]?.summary) : undefined
  };
}

function eventCompetition(event, league) {
  const competition = Array.isArray(event?.competitions) ? event.competitions[0] : undefined;
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
  const home = competitors.find((item) => item?.homeAway === "home") || competitors[0];
  const away = competitors.find((item) => item?.homeAway === "away") || competitors[1];
  return { competition, home, away };
}

function normalizeEvent(event, league) {
  if (!event || typeof event !== "object") return null;
  const { competition, home, away } = eventCompetition(event, league);
  if (!home || !away) return null;

  const status = normalizeStatus(event);
  const homeTeam = normalizeTeam(home, "Home");
  const awayTeam = normalizeTeam(away, "Away");
  const leagueName = safeString(event?.league?.name) || safeString(event?.season?.name) || league.name;
  const kickoffTimestamp = safeString(event.date) || safeString(competition?.date);
  const venue = [safeString(competition?.venue?.fullName), safeString(competition?.venue?.address?.city)].filter(Boolean).join(", ") || undefined;
  const thumbnail = Array.isArray(event.competitions?.[0]?.notes) ? undefined : Array.isArray(event.links) ? event.links[0]?.href : undefined;
  const id = safeString(event.id) || `${league.key}-${homeTeam.name}-${awayTeam.name}-${kickoffTimestamp || "match"}`;

  return {
    id,
    fixtureId: id,
    leagueKey: league.key,
    competition: leagueName,
    competitionSlug: slugify(leagueName),
    competitionLogo: Array.isArray(event?.league?.logos) ? safeString(event.league.logos[0]?.href) : undefined,
    round: safeString(event.week?.text) || safeString(event.season?.slug),
    status: status.status,
    statusText: status.statusText,
    minute: status.minute,
    kickoffTime: formatKickoffTime(kickoffTimestamp),
    kickoffTimestamp,
    venue,
    referee: undefined,
    attendance: safeString(competition?.attendance),
    homeTeam,
    awayTeam,
    homeScore: safeNumber(home.score),
    awayScore: safeNumber(away.score),
    isLive: status.isLive,
    isUpcoming: status.isUpcoming,
    isFinished: status.isFinished,
    title: safeString(event.name) || `${homeTeam.name} vs ${awayTeam.name}`,
    score: {
      home: safeNumber(home.score),
      away: safeNumber(away.score)
    },
    time: formatKickoffTime(kickoffTimestamp),
    league: leagueName,
    thumbnail
  };
}

async function fetchEspnScoreboard(league, params = {}) {
  const url = new URL(`${ESPN_BASE_URL}/${league.key}/scoreboard`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 }
  });

  if (!response.ok) throw new Error(`ESPN ${league.key} returned ${response.status}`);
  return response.json();
}

async function fetchLeagueEvents(league, params) {
  const json = await fetchEspnScoreboard(league, params);
  return Array.isArray(json?.events) ? json.events.map((event) => normalizeEvent(event, league)).filter(Boolean) : [];
}

function sortMatches(matches) {
  const priorities = new Map(ESPN_LEAGUES.map((league) => [league.key, league.priority]));
  return [...matches].sort((a, b) => {
    const groupA = a.isLive ? 0 : a.isUpcoming ? 1 : a.isFinished ? 2 : 3;
    const groupB = b.isLive ? 0 : b.isUpcoming ? 1 : b.isFinished ? 2 : 3;
    if (groupA !== groupB) return groupA - groupB;
    const priorityDelta = (priorities.get(a.leagueKey) ?? 1000) - (priorities.get(b.leagueKey) ?? 1000);
    if (priorityDelta !== 0) return priorityDelta;
    const aTime = Date.parse(a.kickoffTimestamp || "");
    const bTime = Date.parse(b.kickoffTimestamp || "");
    const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
    const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
    return a.isFinished && b.isFinished ? safeB - safeA : safeA - safeB;
  });
}

function dedupeMatches(matches) {
  const byId = new Map();
  for (const match of matches) byId.set(match.fixtureId || match.id, match);
  return sortMatches([...byId.values()]);
}

async function getScoreboardMatches(offsets = [-2, -1, 0, 1, 2]) {
  const requests = [];
  for (const league of ESPN_LEAGUES) {
    for (const offset of offsets) {
      requests.push({ league, params: { dates: formatEspnDate(dateOffset(offset)) } });
    }
  }

  const results = await Promise.allSettled(requests.map((request) => fetchLeagueEvents(request.league, request.params)));
  const matches = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      matches.push(...result.value);
      return;
    }
    const request = requests[index];
    errors.push({
      competition: request.league.name,
      competitionSlug: slugify(request.league.name),
      reason: result.reason instanceof Error ? result.reason.message : "Unable to load matches"
    });
  });

  return { matches: dedupeMatches(matches), errors };
}

export async function getLiveMatches() {
  try {
    const { matches } = await getScoreboardMatches([0]);
    return matches.filter((match) => match.isLive);
  } catch (error) {
    console.error("ESPN live matches failed", error);
    return [];
  }
}

export async function getUpcomingMatches() {
  try {
    const { matches } = await getScoreboardMatches([0, 1, 2]);
    return matches.filter((match) => match.isUpcoming);
  } catch (error) {
    console.error("ESPN upcoming matches failed", error);
    return [];
  }
}

export async function getHighlights() {
  try {
    const { matches } = await getScoreboardMatches([-2, -1, 0]);
    return matches.filter((match) => match.isFinished);
  } catch (error) {
    console.error("ESPN highlights failed", error);
    return [];
  }
}

export async function getMatchById(matchId) {
  try {
    const id = String(matchId || "").trim();
    if (!id) return null;

    const { matches } = await getScoreboardMatches([-2, -1, 0, 1, 2]);
    return matches.find((match) => match.fixtureId === id || match.id === id) || null;
  } catch (error) {
    console.error("ESPN match lookup failed", error);
    return null;
  }
}

export async function getScoreboard() {
  try {
    return await getScoreboardMatches([-2, -1, 0, 1, 2]);
  } catch (error) {
    console.error("ESPN scoreboard failed", error);
    return {
      matches: [],
      errors: [{ competition: "ESPN", competitionSlug: "espn", reason: "Unable to load matches" }]
    };
  }
}

export async function getWorldCupMatches() {
  try {
    const worldCup = ESPN_LEAGUES.find((league) => league.key === "fifa.world") || ESPN_LEAGUES[0];
    const offsets = [-7, -3, -2, -1, 0, 1, 2, 3, 7];
    const results = await Promise.allSettled(offsets.map((offset) => fetchLeagueEvents(worldCup, { dates: formatEspnDate(dateOffset(offset)) })));
    const matches = [];
    const errors = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") matches.push(...result.value);
      else errors.push({ competition: worldCup.name, competitionSlug: slugify(worldCup.name), reason: "Unable to load matches" });
    });

    return { matches: dedupeMatches(matches), errors };
  } catch (error) {
    console.error("ESPN World Cup matches failed", error);
    return {
      matches: [],
      errors: [{ competition: "FIFA World Cup", competitionSlug: "fifa-world-cup", reason: "Unable to load matches" }]
    };
  }
}

