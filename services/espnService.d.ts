import type { FootballScoreboardResponse, NormalizedFootballScore } from "@/services/api/football";

type EspnScoreboardResult = Pick<FootballScoreboardResponse, "matches" | "errors">;

export function getLiveMatches(): Promise<NormalizedFootballScore[]>;
export function getUpcomingMatches(): Promise<NormalizedFootballScore[]>;
export function getHighlights(): Promise<NormalizedFootballScore[]>;
export function getMatchById(matchId: string): Promise<NormalizedFootballScore | null>;
export function getScoreboard(): Promise<EspnScoreboardResult>;
export function getWorldCupMatches(): Promise<EspnScoreboardResult>;
