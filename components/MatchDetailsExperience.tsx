"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, MapPin, Play, Shield, Users } from "lucide-react";
import { Shell } from "@/components/Shell";
import { useFootballLiveScores, useFootballMatchCenter, useHomeData, usePrefetchMatchCard } from "@/hooks/useStreamedData";
import { storeWatchRoute } from "@/lib/watchRouteStore";
import { cn } from "@/lib/utils";
import type { MatchCardView } from "@/services/api/types";
import type { NormalizedFootballMatchCenter, NormalizedFootballScore } from "@/services/api/football";

type MatchDetailsExperienceProps = {
  matchId: string;
};

type DetailsTab = "Stats" | "Lineups" | "Timeline" | "Standings";

const tabs: DetailsTab[] = ["Stats", "Lineups", "Timeline", "Standings"];

function normalizeText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cardIncludesTeam(card: MatchCardView, name: string, shortName: string) {
  const text = normalizeText([card.title, card.competition, ...card.teams.map((team) => team.name)].join(" "));
  const names = [name, shortName].map(normalizeText).filter((value) => value.length >= 2);
  return names.some((nameValue) => text.includes(nameValue));
}

function findLiveStream(score: NormalizedFootballScore | undefined, liveMatches: MatchCardView[]) {
  if (!score?.isLive) return undefined;
  return liveMatches.find((match) => {
    if (!match.href || !match.watchSource || !match.watchId) return false;
    return cardIncludesTeam(match, score.homeTeam.name, score.homeTeam.shortName) && cardIncludesTeam(match, score.awayTeam.name, score.awayTeam.shortName);
  });
}

function teamLogo(src?: string) {
  return src ?? "/brand/nj-sports-logo.png";
}

function kickoffMessage(score: NormalizedFootballScore) {
  if (score.isFinished) return "FT";
  if (score.isLive) return score.minute ? `LIVE ${score.minute}` : "LIVE";
  if (!score.kickoffTimestamp) return "Starting Soon";
  const diffMs = Date.parse(score.kickoffTimestamp) - Date.now();
  if (diffMs <= 0) return "Starting Soon";
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.round((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 0 ? `Kickoff in ${hours}h ${minutes}m` : `Kickoff in ${minutes}m`;
}

function MatchSkeleton() {
  return (
    <Shell>
      <main className="min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-64 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.055]" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.055]" />)}
          </div>
          <div className="h-80 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.055]" />
        </div>
      </main>
    </Shell>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-sm text-studio-muted">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2">{body}</p>
    </div>
  );
}

function StatsTab({ data }: { data: NormalizedFootballMatchCenter }) {
  if (data.stats.length === 0) return <EmptyBlock title="Stats unavailable" body="Match statistics are not available yet." />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center justify-between gap-4 text-sm font-semibold text-white">
            <span>{stat.home}</span>
            <span className="text-center text-xs font-medium uppercase tracking-[0.14em] text-studio-muted">{stat.label}</span>
            <span>{stat.away}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineupsTab({ data }: { data: NormalizedFootballMatchCenter }) {
  const sides = [data.lineups.home, data.lineups.away];
  if (sides.every((side) => side.startingXI.length === 0 && side.bench.length === 0 && !side.coach && !side.formation)) {
    return <EmptyBlock title="Lineups unavailable" body="Starting XI and bench details are not available yet." />;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sides.map((side) => (
        <div key={side.team} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">{side.team}</h3>
            {side.formation ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{side.formation}</span> : null}
          </div>
          {side.coach ? <p className="mb-4 text-sm text-studio-muted">Coach: <span className="text-white">{side.coach}</span></p> : null}
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-studio-muted">Starting XI</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {side.startingXI.length > 0 ? side.startingXI.map((player) => <span key={player} className="rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/86">{player}</span>) : <span className="text-sm text-studio-muted">Not available</span>}
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-studio-muted">Bench</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {side.bench.length > 0 ? side.bench.map((player) => <span key={player} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/74">{player}</span>) : <span className="text-sm text-studio-muted">Not available</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ data }: { data: NormalizedFootballMatchCenter }) {
  if (data.timeline.length === 0) return <EmptyBlock title="Timeline unavailable" body="Key events are not available yet." />;
  return (
    <div className="space-y-3">
      {data.timeline.map((event) => (
        <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-white">{event.type}</span>
            <div>
              <p className="text-sm font-semibold text-white">{event.minute ? `${event.minute} ` : ""}{event.title}</p>
              {event.player ? <p className="mt-1 text-sm text-studio-muted">{event.player}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StandingsTab({ data }: { data: NormalizedFootballMatchCenter }) {
  if (!data.hasStandings) return <EmptyBlock title="Standings unavailable" body="Standings are not available for this fixture." />;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055]">
      <div className="grid grid-cols-[3rem_1fr_3rem_3rem_3rem_3rem_3rem] gap-2 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-studio-muted">
        <span>#</span><span>Team</span><span>PL</span><span>W</span><span>D</span><span>L</span><span>PTS</span>
      </div>
      {data.standings.slice(0, 12).map((row, index) => (
        <div key={`${row.team}-${index}`} className="grid grid-cols-[3rem_1fr_3rem_3rem_3rem_3rem_3rem] items-center gap-2 border-b border-white/5 px-4 py-3 text-sm text-white last:border-b-0">
          <span className="text-studio-muted">{row.rank ?? index + 1}</span>
          <span className="flex min-w-0 items-center gap-2"><img src={teamLogo(row.logo)} alt="" className="h-6 w-6 rounded-full object-contain" /><span className="truncate">{row.team}</span></span>
          <span>{row.played ?? "-"}</span><span>{row.wins ?? "-"}</span><span>{row.draws ?? "-"}</span><span>{row.losses ?? "-"}</span><span>{row.points ?? "-"}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveTab({ tab, data }: { tab: DetailsTab; data: NormalizedFootballMatchCenter }) {
  if (tab === "Stats") return <StatsTab data={data} />;
  if (tab === "Lineups") return <LineupsTab data={data} />;
  if (tab === "Timeline") return <TimelineTab data={data} />;
  return <StandingsTab data={data} />;
}

function MatchCenterFailure({ score, matchId, isFetching, onRetry }: { score?: NormalizedFootballScore; matchId: string; isFetching: boolean; onRetry: () => void }) {
  return (
    <Shell>
      <main className="min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-premium backdrop-blur-2xl">
          <div className="border-b border-white/10 p-5 sm:p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-studio-muted">Match Center</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white sm:text-4xl">
              {score ? `${score.homeTeam.name} vs ${score.awayTeam.name}` : `Fixture ${matchId}`}
            </h1>
            {score ? <p className="mt-2 text-sm text-studio-muted">{score.competition}</p> : null}
          </div>

          {score ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-5 sm:p-8">
              <div className="min-w-0 text-left">
                <img src={teamLogo(score.homeTeam.logo)} alt="" className="mb-3 h-14 w-14 rounded-full object-contain" />
                <p className="truncate text-lg font-semibold text-white">{score.homeTeam.name}</p>
              </div>
              <div className="text-center">
                <p className={cn("mb-3 rounded-full px-3 py-1 text-xs font-bold", score.isLive ? "bg-studio-accent text-white" : "bg-white/10 text-white/80")}>{kickoffMessage(score)}</p>
                <p className="text-5xl font-semibold tabular-nums text-white">{score.homeScore ?? "-"} <span className="text-studio-muted">-</span> {score.awayScore ?? "-"}</p>
              </div>
              <div className="min-w-0 text-right">
                <img src={teamLogo(score.awayTeam.logo)} alt="" className="mb-3 ml-auto h-14 w-14 rounded-full object-contain" />
                <p className="truncate text-lg font-semibold text-white">{score.awayTeam.name}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-4 sm:p-6">
            {score ? <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><CalendarClock className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Kickoff</p><p className="mt-1 text-sm font-semibold text-white">{score.kickoffTime ?? "TBD"}</p></div> : null}
            {score ? <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Shield className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Status</p><p className="mt-1 text-sm font-semibold text-white">{score.statusText}</p></div> : null}
            {score?.venue ? <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><MapPin className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Venue</p><p className="mt-1 text-sm font-semibold text-white">{score.venue}</p></div> : null}
            {score?.referee ? <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Users className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Referee</p><p className="mt-1 text-sm font-semibold text-white">{score.referee}</p></div> : null}
          </div>

          <div className="border-t border-white/10 p-5 sm:p-6">
            <p className="text-sm leading-6 text-studio-muted">Details will appear soon</p>
            <button type="button" onClick={onRetry} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">
              {isFetching ? "Retrying..." : "Retry"}
            </button>
          </div>
        </section>
      </main>
    </Shell>
  );
}
export function MatchDetailsExperience({ matchId }: MatchDetailsExperienceProps) {
  const [activeTab, setActiveTab] = useState<DetailsTab>("Stats");
  const match = useFootballMatchCenter(matchId);
  const scores = useFootballLiveScores();
  const { liveMatches } = useHomeData();
  const prefetchMatch = usePrefetchMatchCard();
  const fallbackScore = useMemo(() => (scores.data ?? []).find((score) => score.fixtureId === matchId || score.id === matchId), [matchId, scores.data]);
  const stream = useMemo(() => findLiveStream(match.data?.score ?? fallbackScore, liveMatches), [fallbackScore, liveMatches, match.data?.score]);

  useEffect(() => {
    if (!match.isError && match.data) return;
    const interval = window.setInterval(() => {
      void match.refetch();
      void scores.refetch();
    }, fallbackScore?.isLive ? 30000 : 300000);
    return () => window.clearInterval(interval);
  }, [fallbackScore?.isLive, match, scores]);

  if (match.isLoading) return <MatchSkeleton />;

  if (match.isError || !match.data) {
    return <MatchCenterFailure score={fallbackScore} matchId={matchId} isFetching={match.isFetching || scores.isFetching} onRetry={() => { void match.refetch(); void scores.refetch(); }} />;
  }

  const score = match.data.score;
  const streamWithFixture = stream ? { ...stream, fixtureId: score.id } : undefined;

  return (
    <Shell>
      <main className="min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-studio-muted transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-premium backdrop-blur-2xl">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-studio-muted"><img src={teamLogo(score.competitionLogo)} alt="" className="h-5 w-5 rounded-full object-contain" /> {score.competition}</p>
                  <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white sm:text-4xl">{score.homeTeam.name} vs {score.awayTeam.name}</h1>
                  <p className="mt-2 text-sm text-studio-muted">{score.statusText}</p>
                </div>
                {score.isLive && streamWithFixture ? (
                  <Link href={streamWithFixture.href ?? "/live"} onMouseEnter={() => prefetchMatch(streamWithFixture)} onFocus={() => prefetchMatch(streamWithFixture)} onClick={() => storeWatchRoute(streamWithFixture)} className="inline-flex items-center gap-2 rounded-full bg-studio-accent px-5 py-3 text-sm font-bold text-white shadow-premium transition hover:scale-[1.02]"><Play className="h-4 w-4 fill-current" /> Watch Live</Link>
                ) : score.isLive ? (
                  <span className="rounded-full border border-white/10 bg-white/8 px-5 py-3 text-sm font-semibold text-studio-muted">No stream currently available</span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/8 px-5 py-3 text-sm font-semibold text-studio-muted">{kickoffMessage(score)}</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-5 sm:p-8">
              <div className="min-w-0 text-left">
                <img src={teamLogo(score.homeTeam.logo)} alt="" className="mb-3 h-14 w-14 rounded-full object-contain" />
                <p className="truncate text-lg font-semibold text-white">{score.homeTeam.name}</p>
                {score.homeTeam.record ? <p className="mt-1 text-sm text-studio-muted">{score.homeTeam.record}</p> : null}
              </div>
              <div className="text-center">
                <p className={cn("mb-3 rounded-full px-3 py-1 text-xs font-bold", score.isLive ? "bg-studio-accent text-white" : "bg-white/10 text-white/80")}>{kickoffMessage(score)}</p>
                <p className="text-5xl font-semibold tabular-nums text-white">{score.homeScore ?? "-"} <span className="text-studio-muted">-</span> {score.awayScore ?? "-"}</p>
              </div>
              <div className="min-w-0 text-right">
                <img src={teamLogo(score.awayTeam.logo)} alt="" className="mb-3 ml-auto h-14 w-14 rounded-full object-contain" />
                <p className="truncate text-lg font-semibold text-white">{score.awayTeam.name}</p>
                {score.awayTeam.record ? <p className="mt-1 text-sm text-studio-muted">{score.awayTeam.record}</p> : null}
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><CalendarClock className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Kickoff</p><p className="mt-1 text-sm font-semibold text-white">{score.kickoffTime ?? "TBD"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><MapPin className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Venue</p><p className="mt-1 text-sm font-semibold text-white">{score.venue ?? "Not available"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Shield className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Referee</p><p className="mt-1 text-sm font-semibold text-white">{score.referee ?? "Not available"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><Users className="h-5 w-5 text-studio-muted" /><p className="mt-3 text-xs uppercase tracking-[0.16em] text-studio-muted">Attendance</p><p className="mt-1 text-sm font-semibold text-white">{score.attendance ?? "Not available"}</p></div>
          </section>

          <section className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-premium backdrop-blur-2xl sm:p-5">
            <div className="relative mb-5 grid grid-cols-4 gap-1 rounded-full bg-white/[0.055] p-1">
              {tabs.map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn("relative z-10 rounded-full px-2 py-2 text-xs font-semibold transition", activeTab === tab ? "text-white" : "text-studio-muted hover:text-white")}>{tab}</button>
              ))}
              <motion.div layoutId="details-tab" className="absolute bottom-1 top-1 rounded-full bg-white/12 ring-1 ring-white/10" style={{ left: `calc(${tabs.indexOf(activeTab) * 25}% + 0.25rem)`, width: "calc(25% - 0.5rem)" }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <ActiveTab tab={activeTab} data={match.data} />
          </section>
        </div>
      </main>
    </Shell>
  );
}