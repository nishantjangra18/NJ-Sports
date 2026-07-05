import {
  getMatchById,
  getScoreboard,
  getWorldCupMatches
} from "@/services/espnService";

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

type EspnScoreboard = {
  matches: NormalizedFootballScore[];
  errors: FootballScoreboardResponse["errors"];
};

function toLineupSide(team: string): NormalizedFootballLineup {
  return {
    team,
    startingXI: [],
    bench: []
  };
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

function sortWorldCupMatches(matches: WorldCupMatch[]) {
  return [...matches].sort((a, b) => {
    const rankA = a.isLive ? 0 : a.isUpcoming ? 1 : a.isFinished ? 2 : 3;
    const rankB = b.isLive ? 0 : b.isUpcoming ? 1 : b.isFinished ? 2 : 3;
    if (rankA !== rankB) return rankA - rankB;
    const aTime = Date.parse(a.kickoffTimestamp ?? "");
    const bTime = Date.parse(b.kickoffTimestamp ?? "");
    const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
    const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
    return a.isFinished && b.isFinished ? safeB - safeA : safeA - safeB;
  });
}

export async function getFootballScoreboard(): Promise<FootballScoreboardResponse> {
  const scoreboard = await getScoreboard() as EspnScoreboard;
  return {
    matches: scoreboard.matches ?? [],
    errors: scoreboard.errors ?? [],
    fetchedAt: new Date().toISOString()
  };
}

export async function getWorldCup2026Fixtures(): Promise<WorldCupHubResponse> {
  const scoreboard = await getWorldCupMatches() as EspnScoreboard;
  const all = sortWorldCupMatches((scoreboard.matches ?? []).map(toWorldCupMatch));

  return {
    worldCupId: "fifa.world",
    live: sortWorldCupMatches(all.filter((match) => match.isLive || match.status === "HT")),
    upcoming: sortWorldCupMatches(all.filter((match) => match.isUpcoming)),
    finished: sortWorldCupMatches(all.filter((match) => match.isFinished)),
    all,
    errors: scoreboard.errors ?? [],
    fetchedAt: new Date().toISOString()
  };
}

export async function getFootballMatchCenter(matchId: string): Promise<NormalizedFootballMatchCenter | null> {
  const score = await getMatchById(matchId) as NormalizedFootballScore | null;
  if (!score) return null;

  return {
    score,
    stats: [],
    timeline: [],
    lineups: {
      home: toLineupSide(score.homeTeam.name),
      away: toLineupSide(score.awayTeam.name)
    },
    standings: [],
    hasStandings: false,
    fetchedAt: new Date().toISOString()
  };
}
