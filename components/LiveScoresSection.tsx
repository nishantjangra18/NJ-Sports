"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import { useFootballLiveScores } from "@/hooks/useStreamedData";
import { cn } from "@/lib/utils";
import type { MatchCardView } from "@/services/api/types";
import type { FootballScoreStatus, NormalizedFootballScore } from "@/services/api/football";

type LiveScoresSectionProps = {
  liveMatches: MatchCardView[];
};

type ScoreCardItem = NormalizedFootballScore & {
  competitionBadge: string;
};

const statusStyles: Record<FootballScoreStatus, string> = {
  LIVE: "bg-studio-accent/18 text-red-300 ring-red-500/35",
  HT: "bg-orange-400/16 text-orange-200 ring-orange-400/35",
  FT: "bg-white/10 text-zinc-300 ring-white/12",
  UPCOMING: "bg-sky-400/16 text-sky-200 ring-sky-400/35",
  UNKNOWN: "bg-white/10 text-zinc-300 ring-white/12"
};

function competitionBadge(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "BALL";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase();
}

function statusLabel(item: NormalizedFootballScore) {
  if (item.isLive) return "LIVE";
  if (item.isFinished) return "FT";
  if (item.isUpcoming) return "UPCOMING";
  return item.status === "UNKNOWN" ? "UPCOMING" : item.status;
}

function detailLabel(item: NormalizedFootballScore) {
  if (item.isLive) return item.minute ?? item.statusText;
  if (item.isUpcoming) return item.kickoffTime ?? "Kickoff TBA";
  if (item.isFinished) return "Match finished";
  return item.kickoffTime ?? item.statusText;
}

function teamLogo(src?: string) {
  return src ?? "/brand/nj-sports-logo.png";
}

function toScoreCardItem(score: NormalizedFootballScore): ScoreCardItem {
  return {
    ...score,
    competitionBadge: competitionBadge(score.competition)
  };
}

function ScoreCard({ item }: { item: ScoreCardItem }) {
  return (
    <Link href={`/matches/${encodeURIComponent(item.fixtureId)}`} className="block shrink-0 focus:outline-none">
      <motion.article
        whileHover={{ y: -3, scale: 1.012 }}
        transition={{ duration: 0.2 }}
        className="relative h-[112px] w-[318px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-2xl focus-within:ring-2 focus-within:ring-white/25 max-md:h-[124px] max-md:w-[calc(100vw-2rem)] max-md:snap-start max-md:px-3.5"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-studio-muted max-md:max-w-[62%]">{item.competition}</span>
          <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ring-1", statusStyles[item.status])}>
            {statusLabel(item)}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 max-md:gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src={teamLogo(item.homeTeam.logo)} alt="" className="h-6 w-7 rounded-[4px] object-contain ring-1 ring-white/15" />
            <span className="min-w-0 truncate text-sm font-semibold text-white max-md:text-[13px]">{item.homeTeam.name}</span>
            <span className="ml-auto text-2xl font-semibold tabular-nums text-white max-md:text-xl">{item.homeScore ?? "-"}</span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">vs</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white max-md:text-xl">{item.awayScore ?? "-"}</span>
            <span className="ml-auto min-w-0 truncate text-sm font-semibold text-white max-md:text-[13px]">{item.awayTeam.name}</span>
            <img src={teamLogo(item.awayTeam.logo)} alt="" className="h-6 w-7 rounded-[4px] object-contain ring-1 ring-white/15" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-medium text-studio-muted">
          <span className="truncate">{detailLabel(item)}</span>
          <span className="rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/72">{item.competitionBadge}</span>
        </div>
      </motion.article>
    </Link>
  );
}

function LiveScoresSkeleton() {
  return (
    <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
      <div className="mb-4 h-6 w-36 rounded-full bg-white/10" />
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-[112px] w-[318px] shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/[0.055] max-md:h-[124px] max-md:w-[calc(100vw-2rem)] max-md:snap-start" />
        ))}
      </div>
    </section>
  );
}

export const LiveScoresSection = memo(function LiveScoresSection(_props: LiveScoresSectionProps) {
  const scoresQuery = useFootballLiveScores();
  const scores = useMemo(() => (scoresQuery.data ?? []).map(toScoreCardItem), [scoresQuery.data]);

  if (scoresQuery.isLoading) return <LiveScoresSkeleton />;

  return (
    <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">Live Scores</h2>
      </div>

      {scores.length > 0 ? (
        <HorizontalCarousel title="Live Scores" className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-4 max-md:snap-x max-md:snap-mandatory">
          {scores.map((item, index) => <ScoreCard key={`${item.fixtureId}-${index}`} item={item} />)}
        </HorizontalCarousel>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-5 text-sm text-studio-muted">
          Scores will appear here shortly.
        </div>
      )}
    </section>
  );
});
