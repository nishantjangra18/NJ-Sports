"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { useFootballMatchCenter } from "@/hooks/useStreamedData";
import { cn } from "@/lib/utils";
import type { NormalizedFootballLineup, NormalizedFootballMatchCenter, NormalizedFootballTimelineEvent } from "@/services/api/football";

type MatchCenterPanelProps = {
  open: boolean;
  matchId?: string;
  onClose: () => void;
};

type MatchCenterTab = "Score" | "Stats" | "Timeline" | "Lineups";

const tabs: MatchCenterTab[] = ["Score", "Stats", "Timeline", "Lineups"];

function teamLogo(src?: string) {
  return src ?? "/brand/nj-sports-logo.png";
}

function eventIcon(type: NormalizedFootballTimelineEvent["type"]) {
  if (type === "goal") return "GOAL";
  if (type === "yellow") return "YC";
  if (type === "red") return "RC";
  if (type === "substitution") return "SUB";
  if (type === "var") return "VAR";
  if (type === "half-time") return "HT";
  if (type === "full-time") return "FT";
  return "INFO";
}

function MatchCenterSkeleton() {
  return (
    <div className="space-y-5 p-5">
      <div className="h-5 w-44 animate-pulse rounded-full bg-white/10" />
      <div className="grid grid-cols-3 items-center gap-3">
        <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="flex gap-2">
        {tabs.map((tab) => <div key={tab} className="h-9 flex-1 animate-pulse rounded-full bg-white/10" />)}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-white/10" />)}
      </div>
    </div>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-studio-muted">{body}</p>
    </div>
  );
}

function ScoreTab({ data }: { data: NormalizedFootballMatchCenter }) {
  const score = data.score;
  return (
    <div className="space-y-3">
      {[
        ["Current Score", `${score.homeTeam.shortName} ${score.homeScore ?? "-"} - ${score.awayScore ?? "-"} ${score.awayTeam.shortName}`],
        ["Minute", score.minute ?? (score.isFinished ? "FT" : score.isUpcoming ? "Not started" : "LIVE")],
        ["Match Status", score.statusText],
        ["Kickoff", score.kickoffTime ?? "TBD"],
        ["Venue", score.venue ?? "Not available"],
        ["Referee", score.referee ?? "Not available"]
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-studio-muted">{label}</p>
          <p className="mt-2 text-lg font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatsTab({ data }: { data: NormalizedFootballMatchCenter }) {
  if (data.stats.length === 0) return <EmptyBlock title="Stats unavailable" body="Match statistics are not available yet." />;
  return (
    <div className="grid gap-3">
      {data.stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
            <span>{stat.home}</span>
            <span className="text-center text-xs font-medium uppercase tracking-[0.14em] text-studio-muted">{stat.label}</span>
            <span>{stat.away}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ data }: { data: NormalizedFootballMatchCenter }) {
  if (data.timeline.length === 0) return <EmptyBlock title="Timeline unavailable" body="Key events are not available yet." />;
  return (
    <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto pr-1">
      {data.timeline.map((event) => (
        <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white">{eventIcon(event.type)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{event.minute ? `${event.minute} ` : ""}{event.title}</p>
              {event.player ? <p className="mt-1 text-sm text-studio-muted">{event.player}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineupBlock({ lineup }: { lineup: NormalizedFootballLineup }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{lineup.team}</h3>
        {lineup.formation ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{lineup.formation}</span> : null}
      </div>
      {lineup.coach ? <p className="mb-4 text-sm text-studio-muted">Coach: <span className="text-white">{lineup.coach}</span></p> : null}
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-studio-muted">Starting XI</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {lineup.startingXI.length > 0 ? lineup.startingXI.map((player) => <span key={player} className="rounded-full bg-black/35 px-2.5 py-1 text-xs text-white/86">{player}</span>) : <span className="text-sm text-studio-muted">Not available</span>}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-studio-muted">Bench</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {lineup.bench.length > 0 ? lineup.bench.map((player) => <span key={player} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/74">{player}</span>) : <span className="text-sm text-studio-muted">Not available</span>}
      </div>
    </div>
  );
}

function LineupsTab({ data }: { data: NormalizedFootballMatchCenter }) {
  const noLineups = [data.lineups.home, data.lineups.away].every((lineup) => lineup.startingXI.length === 0 && lineup.bench.length === 0 && !lineup.coach && !lineup.formation);
  if (noLineups) return <EmptyBlock title="Lineups unavailable" body="Official lineups are not available yet." />;
  return (
    <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto pr-1">
      <LineupBlock lineup={data.lineups.home} />
      <LineupBlock lineup={data.lineups.away} />
    </div>
  );
}

function ActiveTab({ tab, data }: { tab: MatchCenterTab; data: NormalizedFootballMatchCenter }) {
  if (tab === "Score") return <ScoreTab data={data} />;
  if (tab === "Stats") return <StatsTab data={data} />;
  if (tab === "Timeline") return <TimelineTab data={data} />;
  return <LineupsTab data={data} />;
}

export function MatchCenterPanel({ open, matchId, onClose }: MatchCenterPanelProps) {
  const [activeTab, setActiveTab] = useState<MatchCenterTab>("Score");
  const match = useFootballMatchCenter(matchId, open);
  const data = match.data;

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ x: 440, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 440, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-0 top-0 z-50 h-full w-full max-w-[420px] border-l border-white/10 bg-[#090909]/96 text-white shadow-[-30px_0_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-studio-muted">{data?.score.competition ?? "Match Center"}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">Live Match Center</h2>
                </div>
                <button type="button" aria-label="Close Match Center" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/8 text-white transition hover:bg-white/14">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {data ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="min-w-0 text-left">
                    <img src={teamLogo(data.score.homeTeam.logo)} alt="" className="mb-2 h-9 w-9 rounded-full object-contain" />
                    <p className="truncate text-sm font-semibold text-white">{data.score.homeTeam.name}</p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums text-white">{data.score.homeScore ?? "-"}</p>
                  </div>
                  <div className="text-center">
                    <p className="rounded-full bg-studio-accent px-3 py-1 text-xs font-bold text-white">{data.score.isLive ? `LIVE ${data.score.minute ?? ""}` : data.score.status}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <img src={teamLogo(data.score.awayTeam.logo)} alt="" className="mb-2 ml-auto h-9 w-9 rounded-full object-contain" />
                    <p className="truncate text-sm font-semibold text-white">{data.score.awayTeam.name}</p>
                    <p className="mt-2 text-4xl font-semibold tabular-nums text-white">{data.score.awayScore ?? "-"}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-b border-white/10 px-5 pt-4">
              <div className="relative grid grid-cols-4 gap-1 rounded-full bg-white/[0.055] p-1">
                {tabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn("relative z-10 rounded-full px-2 py-2 text-xs font-semibold transition", activeTab === tab ? "text-white" : "text-studio-muted hover:text-white")}>{tab}</button>
                ))}
                <motion.div
                  layoutId="match-center-tab"
                  className="absolute bottom-1 top-1 rounded-full bg-white/12 ring-1 ring-white/10"
                  style={{ left: `calc(${tabs.indexOf(activeTab) * 25}% + 0.25rem)`, width: "calc(25% - 0.5rem)" }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-5">
              {match.isLoading ? <MatchCenterSkeleton /> : data ? <ActiveTab tab={activeTab} data={data} /> : <EmptyBlock title="Match center unavailable" body="Details will appear soon" />}
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}