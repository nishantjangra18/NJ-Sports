"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createLiveFootballCards, createMatchSlug, createRows, getAllMatches, getLiveMatches, getStreams, getTodayMatches, searchCatalog, toMatchCard } from "@/services/api/streamed";
import { getFifaWorldCupHighlights, getHighlightCompetitions, getMls2026Highlights, getUefaChampionsLeagueHighlights, type HighlightCompetition, type OfficialHighlight } from "@/services/api/youtube";
import { readHighlightRoute, storeHighlightRoute } from "@/lib/highlightRouteStore";
import { readWatchRoute, storeWatchRoute } from "@/lib/watchRouteStore";
import type { MatchCardView, SearchResult, StreamedMatch, StreamedStream } from "@/services/api/types";
import type { FootballScoreboardResponse, NormalizedFootballMatchCenter, NormalizedFootballScore, WorldCupHubResponse } from "@/services/api/football";
import type { WorldCupStatsResponse } from "@/services/api/worldCupStats";

export const streamedKeys = {
  live: ["streamed", "matches", "live"] as const,
  today: ["streamed", "matches", "today"] as const,
  all: ["streamed", "matches", "all"] as const,
  streams: (source: string, id: string) => ["streamed", "streams", source, id] as const,
  resolvedStream: (embedUrl: string) => ["streamed", "resolved-stream", embedUrl] as const,
  footballScores: ["football", "scores"] as const,
  worldCupFixtures: ["football", "world-cup-2026"] as const,
  worldCupStats: ["football", "world-cup-2026", "stats"] as const,
  footballMatch: (id: string) => ["football", "match", id] as const,
  fifaHighlights: ["youtube", "fifa", "world-cup-2026"] as const,
  uefaHighlights: ["youtube", "uefa", "champions-league"] as const,
  mlsHighlights: ["youtube", "mls", "2026"] as const,
  highlightCompetitions: ["youtube", "competitions"] as const
};

const matchCacheTime = 1000 * 60 * 20;
const streamCacheTime = 1000 * 60 * 15;
const highlightCacheTime = 1000 * 60 * 30;

async function getFootballScores(): Promise<NormalizedFootballScore[]> {
  const response = await fetch("/api/football/scoreboard", {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Unable to load football scores");
  }

  const data = (await response.json()) as FootballScoreboardResponse;
  return data.matches ?? [];
}
async function getWorldCup2026FootballFixtures(): Promise<WorldCupHubResponse> {
  const response = await fetch("/api/football/world-cup-2026", {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Unable to load match data");
  }

  return (await response.json()) as WorldCupHubResponse;
}
async function getWorldCup2026Stats(): Promise<WorldCupStatsResponse> {
  const response = await fetch("/api/football/world-cup-2026/stats", {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Unable to load World Cup stats");
  }

  return (await response.json()) as WorldCupStatsResponse;
}

async function getFootballMatchCenter(matchId: string): Promise<NormalizedFootballMatchCenter> {
  const response = await fetch(`/api/football/matches/${encodeURIComponent(matchId)}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Unable to load match data");
  }

  return (await response.json()) as NormalizedFootballMatchCenter;
}
function preloadImage(src?: string) {
  if (!src || typeof window === "undefined") return;
  const load = () => {
    const image = new window.Image();
    image.src = src;
  };
  if (window.requestIdleCallback) window.requestIdleCallback(load);
  else window.setTimeout(load, 1);
}

export function useLiveMatches() {
  return useQuery<StreamedMatch[]>({
    queryKey: streamedKeys.live,
    queryFn: getLiveMatches,
    staleTime: 1000 * 20,
    gcTime: matchCacheTime,
    refetchInterval: 1000 * 45
  });
}

export function useTodayMatches() {
  return useQuery<StreamedMatch[]>({
    queryKey: streamedKeys.today,
    queryFn: getTodayMatches,
    staleTime: 1000 * 60 * 5,
    gcTime: matchCacheTime
  });
}

export function useAllMatches() {
  return useQuery<StreamedMatch[]>({
    queryKey: streamedKeys.all,
    queryFn: getAllMatches,
    staleTime: 1000 * 60 * 10,
    gcTime: matchCacheTime
  });
}

export function useStreams(source?: string, id?: string) {
  const enabled = Boolean(source && id);
  return useQuery<StreamedStream[]>({
    queryKey: streamedKeys.streams(source ?? "", id ?? ""),
    queryFn: () => getStreams(source ?? "", id ?? ""),
    enabled,
    staleTime: streamCacheTime,
    gcTime: 1000 * 60 * 30
  });
}


export function useFootballLiveScores() {
  return useQuery<NormalizedFootballScore[]>({
    queryKey: streamedKeys.footballScores,
    queryFn: getFootballScores,
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
    retry: 1
  });
}
export function useWorldCup2026Fixtures() {
  return useQuery<WorldCupHubResponse>({
    queryKey: streamedKeys.worldCupFixtures,
    queryFn: getWorldCup2026FootballFixtures,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 45,
    retry: 1
  });
}
export function useWorldCup2026Stats() {
  return useQuery<WorldCupStatsResponse>({
    queryKey: streamedKeys.worldCupStats,
    queryFn: getWorldCup2026Stats,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1
  });
}

export function useFootballMatchCenter(matchId?: string, enabled = true) {
  return useQuery<NormalizedFootballMatchCenter>({
    queryKey: streamedKeys.footballMatch(matchId ?? ""),
    queryFn: () => getFootballMatchCenter(matchId ?? ""),
    enabled: enabled && Boolean(matchId),
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 10,
    refetchInterval: (query) => query.state.data?.score.isLive ? 1000 * 30 : 1000 * 60 * 5,
    retry: 1
  });
}
export function useHighlightCompetitions() {
  return useQuery<HighlightCompetition[]>({
    queryKey: streamedKeys.highlightCompetitions,
    queryFn: getHighlightCompetitions,
    staleTime: highlightCacheTime,
    gcTime: 1000 * 60 * 60,
    refetchInterval: 1000 * 60 * 60
  });
}
export function useFifaWorldCupHighlights() {
  return useQuery<OfficialHighlight[]>({
    queryKey: streamedKeys.fifaHighlights,
    queryFn: getFifaWorldCupHighlights,
    staleTime: highlightCacheTime,
    gcTime: 1000 * 60 * 60,
    refetchInterval: 1000 * 60 * 60
  });
}

export function useUefaChampionsLeagueHighlights() {
  return useQuery<OfficialHighlight[]>({
    queryKey: streamedKeys.uefaHighlights,
    queryFn: getUefaChampionsLeagueHighlights,
    staleTime: highlightCacheTime,
    gcTime: 1000 * 60 * 60,
    refetchInterval: 1000 * 60 * 60
  });
}

export function useMls2026Highlights() {
  return useQuery<OfficialHighlight[]>({
    queryKey: streamedKeys.mlsHighlights,
    queryFn: getMls2026Highlights,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 10,
    retry: 1
  });
}
export function usePrefetchHighlight() {
  const queryClient = useQueryClient();
  return useCallback((highlight: OfficialHighlight) => {
    storeHighlightRoute(highlight);
    void queryClient.prefetchQuery({ queryKey: streamedKeys.fifaHighlights, queryFn: getFifaWorldCupHighlights, staleTime: highlightCacheTime });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.uefaHighlights, queryFn: getUefaChampionsLeagueHighlights, staleTime: highlightCacheTime });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.highlightCompetitions, queryFn: getHighlightCompetitions, staleTime: highlightCacheTime });
    preloadImage(highlight.thumbnail);
  }, [queryClient]);
}

export function useHighlightRouteTarget(slug: string) {
  const [storedRoute, setStoredRoute] = useState(() => readHighlightRoute(slug));
  const fifaHighlights = useFifaWorldCupHighlights();
  const uefaHighlights = useUefaChampionsLeagueHighlights();
  const mlsHighlights = useMls2026Highlights();

  useEffect(() => {
    setStoredRoute(readHighlightRoute(slug));
  }, [slug]);

  const highlight = useMemo(() => {
    return [...(fifaHighlights.data ?? []), ...(uefaHighlights.data ?? []), ...(mlsHighlights.data ?? [])].find((item) => item.href.endsWith(`/${slug}`));
  }, [fifaHighlights.data, mlsHighlights.data, slug, uefaHighlights.data]);

  useEffect(() => {
    if (highlight) storeHighlightRoute(highlight);
  }, [highlight]);

  return {
    highlight: storedRoute ?? highlight,
    isLoading: !storedRoute && (fifaHighlights.isLoading || uefaHighlights.isLoading),
    isError: fifaHighlights.isError || uefaHighlights.isError,
    retry: () => {
      void fifaHighlights.refetch();
      void uefaHighlights.refetch();
      void mlsHighlights.refetch();
    }
  };
}

export function usePrefetchMatchCard() {
  const queryClient = useQueryClient();

  return useCallback((match: MatchCardView) => {
    storeWatchRoute(match);
    void queryClient.prefetchQuery({ queryKey: streamedKeys.live, queryFn: getLiveMatches, staleTime: 1000 * 20 });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.today, queryFn: getTodayMatches, staleTime: 1000 * 60 * 5 });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.all, queryFn: getAllMatches, staleTime: 1000 * 60 * 10 });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.fifaHighlights, queryFn: getFifaWorldCupHighlights, staleTime: highlightCacheTime });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.uefaHighlights, queryFn: getUefaChampionsLeagueHighlights, staleTime: highlightCacheTime });
    void queryClient.prefetchQuery({ queryKey: streamedKeys.highlightCompetitions, queryFn: getHighlightCompetitions, staleTime: highlightCacheTime });
    if (match.watchSource && match.watchId) {
      void queryClient.prefetchQuery({
        queryKey: streamedKeys.streams(match.watchSource, match.watchId),
        queryFn: () => getStreams(match.watchSource!, match.watchId!),
        staleTime: streamCacheTime
      });
    }
    for (const team of match.teams) preloadImage(team.badge);
    preloadImage(match.thumbnail);
  }, [queryClient]);
}

function normalizeMatchText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cardIncludesTeam(match: MatchCardView, name: string, shortName: string) {
  const text = normalizeMatchText([match.title, match.competition, ...match.teams.map((team) => team.name)].join(" "));
  const candidates = [name, shortName].map(normalizeMatchText).filter((item) => item.length >= 2);
  return candidates.some((candidate) => text.includes(candidate));
}

function findFootballScoreForCard(card: MatchCardView | undefined, scores: NormalizedFootballScore[]) {
  if (!card) return undefined;
  return scores.find((score) => (
    cardIncludesTeam(card, score.homeTeam.name, score.homeTeam.shortName) &&
    cardIncludesTeam(card, score.awayTeam.name, score.awayTeam.shortName)
  ));
}
export function useWatchRouteTarget(slug: string) {
  const [storedRoute, setStoredRoute] = useState(() => readWatchRoute(slug));
  const live = useLiveMatches();
  const today = useTodayMatches();
  const all = useAllMatches();
  const footballScores = useFootballLiveScores();

  useEffect(() => {
    setStoredRoute(readWatchRoute(slug));
  }, [slug]);

  const card = useMemo(() => {
    const matches = [...(live.data ?? []), ...(today.data ?? []), ...(all.data ?? [])];
    const bySlug = matches.find((match) => createMatchSlug(match.title) === slug);
    return bySlug ? toMatchCard(bySlug) : undefined;
  }, [all.data, live.data, slug, today.data]);

  const footballScore = useMemo(() => findFootballScoreForCard(card, footballScores.data ?? []), [card, footballScores.data]);

  useEffect(() => {
    if (card) storeWatchRoute({ ...card, fixtureId: footballScore?.fixtureId });
  }, [card, footballScore?.fixtureId]);

  return {
    source: storedRoute?.source ?? card?.watchSource,
    id: storedRoute?.id ?? card?.watchId,
    title: storedRoute?.title ?? card?.title,
    image: storedRoute?.image ?? card?.image,
    competition: storedRoute?.competition ?? card?.competition,
    live: storedRoute?.live ?? card?.live,
    teams: storedRoute?.teams ?? card?.teams,
    fixtureId: storedRoute?.fixtureId ?? card?.fixtureId ?? footballScore?.fixtureId,
    isResolving: !storedRoute && !card && (live.isLoading || today.isLoading || all.isLoading),
    retry: () => {
      void live.refetch();
      void today.refetch();
      void all.refetch();
    }
  };
}

export function useHomeData() {
  const live = useLiveMatches();
  const today = useTodayMatches();
  const all = useAllMatches();

  const liveMatches = live.data ?? [];
  const todayMatches = today.data ?? [];
  const allMatches = all.data ?? [];

  const rows = useMemo(() => createRows(liveMatches, todayMatches, allMatches), [liveMatches, todayMatches, allMatches]);

  return {
    live,
    today,
    all,
    rows,
    liveMatches: createLiveFootballCards(liveMatches, todayMatches, allMatches),
    isLoading: live.isLoading || today.isLoading || all.isLoading,
    isError: live.isError || today.isError || all.isError,
    retry: () => {
      void live.refetch();
      void today.refetch();
      void all.refetch();
    }
  };
}

export function useSearchResults() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const live = useLiveMatches();
  const today = useTodayMatches();
  const all = useAllMatches();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const matches = useMemo(() => {
    const byId = new Map<string, StreamedMatch>();
    for (const match of [...(live.data ?? []), ...(today.data ?? []), ...(all.data ?? [])]) byId.set(match.id, match);
    return Array.from(byId.values());
  }, [all.data, live.data, today.data]);

  const results: SearchResult[] = useMemo(() => searchCatalog(debouncedQuery, matches), [debouncedQuery, matches]);

  return {
    query,
    setQuery,
    results,
    isLoading: query.trim().length >= 2 && (query !== debouncedQuery || live.isLoading || today.isLoading || all.isLoading)
  };
}







