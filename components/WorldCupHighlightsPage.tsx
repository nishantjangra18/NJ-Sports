"use client";

import Link from "next/link";
import { useMemo, type ReactNode, type SyntheticEvent } from "react";
import { motion } from "framer-motion";
import { CalendarClock, MapPin, Play, Radio } from "lucide-react";
import { HighlightRow } from "@/components/HighlightRow";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import { SafeImage } from "@/components/SafeImage";
import { Shell } from "@/components/Shell";
import { useFifaWorldCupHighlights, useWorldCup2026Fixtures, useWorldCup2026Stats } from "@/hooks/useStreamedData";
import { cn } from "@/lib/utils";
import worldCupWinners from "@/data/world-cup-winners.json";
import type { WorldCupMatch } from "@/services/api/football";
import type { WorldCupPlayerStat } from "@/services/api/worldCupStats";

const heroImage = "/images/fifa-world-cup-2026-hero-bg.png";
const oneHourMs = 60 * 60 * 1000;
const oneDayMs = 24 * oneHourMs;

function timeValue(match: WorldCupMatch) {
  const parsed = Date.parse(match.kickoffTimestamp ?? "");
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function formatMatchTime(timestamp?: string) {
  if (!timestamp) return "TBD";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function formatMatchDate(timestamp?: string) {
  if (!timestamp) return "Date TBA";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(parsed);
}

function statusLabel(match: WorldCupMatch) {
  if (match.isLive) return match.minute ? `LIVE ${match.minute}` : "LIVE";
  if (match.isFinished) return "FULL TIME";
  return "UPCOMING";
}

function isUpcomingByTime(match: WorldCupMatch) {
  const kickoff = timeValue(match);
  return kickoff !== Number.MAX_SAFE_INTEGER && kickoff > Date.now();
}

function isStartingSoon(match: WorldCupMatch) {
  const kickoff = timeValue(match);
  const diff = kickoff - Date.now();
  return diff > 0 && diff <= oneHourMs;
}

function teamLogo(src?: string) {
  return src ?? "/brand/nj-sports-logo.png";
}

function isScoreboardWindow(match: WorldCupMatch) {
  if (match.isLive) return true;
  const kickoff = timeValue(match);
  if (kickoff === Number.MAX_SAFE_INTEGER) return false;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const from = todayStart - 2 * oneDayMs;
  const to = todayStart + 3 * oneDayMs;
  return kickoff >= from && kickoff < to;
}

function scoreRank(match: WorldCupMatch) {
  if (match.isLive) return 0;
  if (match.isFinished) return 1;
  return 2;
}

function visibleScore(matches: WorldCupMatch[]) {
  return matches
    .filter(isScoreboardWindow)
    .sort((a, b) => {
      const rankDelta = scoreRank(a) - scoreRank(b);
      if (rankDelta !== 0) return rankDelta;
      const aTime = timeValue(a);
      const bTime = timeValue(b);
      if (a.isFinished && b.isFinished) return bTime - aTime;
      return aTime - bTime;
    });
}

function upcomingGroups(matches: WorldCupMatch[]) {
  const now = Date.now();
  const max = new Date().setHours(0, 0, 0, 0) + 3 * oneDayMs;
  const upcoming = matches
    .filter((match) => {
      const kickoff = timeValue(match);
      return kickoff > now && kickoff <= max;
    })
    .sort((a, b) => timeValue(a) - timeValue(b));

  return upcoming.reduce<Array<{ date: string; matches: WorldCupMatch[] }>>((groups, match) => {
    const date = formatMatchDate(match.kickoffTimestamp);
    const group = groups.find((item) => item.date === date);
    if (group) group.matches.push(match);
    else groups.push({ date, matches: [match] });
    return groups;
  }, []);
}


function Team({ name, logo, align = "left" }: { name: string; logo?: string; align?: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 max-md:gap-1.5", align === "right" ? "justify-end" : "justify-start")}>
      {align === "left" ? <img src={teamLogo(logo)} alt="" className="h-7 w-8 rounded-[5px] object-contain ring-1 ring-white/15 max-md:h-6 max-md:w-7" /> : null}
      <span className="truncate text-sm font-semibold text-white max-md:text-xs">{name}</span>
      {align === "right" ? <img src={teamLogo(logo)} alt="" className="h-7 w-8 rounded-[5px] object-contain ring-1 ring-white/15 max-md:h-6 max-md:w-7" /> : null}
    </div>
  );
}

function MatchCard({ match, compact = false }: { match: WorldCupMatch; compact?: boolean }) {
  return (
    <Link href={`/matches/${encodeURIComponent(match.fixtureId)}`} className="block focus:outline-none">
      <motion.article
        whileHover={{ y: -5, scale: 1.015 }}
        transition={{ duration: 0.22 }}
        className={cn(
          "group relative overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.075] shadow-[0_20px_70px_rgba(0,0,0,0.36)] backdrop-blur-2xl transition hover:border-white/24",
          compact ? "p-3" : "min-h-[176px] p-4 max-md:min-h-[158px] max-md:p-3",
          match.isFinished ? "opacity-80" : ""
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        <div className="mb-4 flex items-center justify-between gap-3 max-md:mb-3 max-md:gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">{match.competition}</span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", match.isLive ? "bg-red-500/20 text-red-100 ring-red-400/40" : match.isFinished ? "bg-white/10 text-zinc-300 ring-white/12" : "bg-sky-400/18 text-sky-100 ring-sky-300/35")}>
            {match.isLive ? <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.95)] motion-safe:animate-pulse" /> : null}
            {statusLabel(match)}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 max-md:gap-2">
          <Team name={match.homeTeam.name} logo={match.homeTeam.logo} />
          <div className="min-w-[76px] text-center max-md:min-w-[58px]">
            <p className="text-3xl font-semibold tabular-nums text-white max-md:text-2xl">{match.score.home ?? "-"}<span className="mx-2 text-white/35 max-md:mx-1">-</span>{match.score.away ?? "-"}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/46">{match.isLive ? match.minute ?? "LIVE" : formatMatchTime(match.kickoffTimestamp)}</p>
          </div>
          <Team name={match.awayTeam.name} logo={match.awayTeam.logo} align="right" />
        </div>
        {!compact ? (
          <div className="mt-5 flex items-center justify-between gap-3 text-xs font-medium text-white/62 max-md:mt-4 max-md:gap-2 max-md:text-[11px]">
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {formatMatchDate(match.kickoffTimestamp)} at {formatMatchTime(match.kickoffTimestamp)}</span>
            {match.venue ? <span className="truncate">{match.venue}</span> : null}
          </div>
        ) : null}
      </motion.article>
    </Link>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[560px] overflow-hidden px-5 pb-12 pt-24 sm:px-8 lg:px-10">
      <SafeImage src={heroImage} alt="" fill priority sizes="100vw" className="world-cup-hub-hero-image object-cover object-center opacity-100" fallbackSrc="/images/fifa-world-cup-live-template.png" />
      <div className="world-cup-photo-vignette absolute inset-0" />
      <div className="world-cup-glow absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/34 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/78 backdrop-blur-2xl">
            <Radio className="h-4 w-4 text-red-300" /> Tournament Command Feed
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">FIFA World Cup Hub</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/74 sm:text-lg">Live matches, fixtures & highlights in one place</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#world-cup-live" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-[0_16px_42px_rgba(255,255,255,0.18)] transition hover:scale-[1.02]"><Play className="h-4 w-4 fill-current" /> Watch Match Feed</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/46">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white sm:text-3xl">{title}</h2>
      </div>
      {action ? <p className="text-sm font-medium text-white/54">{action}</p> : null}
    </div>
  );
}

function Scorecards({ matches, loading, hasData }: { matches: WorldCupMatch[]; loading: boolean; hasData: boolean }) {
  const scoreMatches = useMemo(() => visibleScore(matches), [matches]);

  return (
    <section id="world-cup-live" className="px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Live scoreboard" title="World Cup Match Center" action="World Cup only" />
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="grid h-[176px] place-items-center rounded-[22px] border border-white/10 bg-white/[0.06] text-sm text-white/62">Loading World Cup data...</div>)}
          </div>
        ) : scoreMatches.length > 0 ? (
          <HorizontalCarousel title="World Cup Match Center" className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-3">
            {scoreMatches.map((match) => <div key={match.fixtureId} className="w-[340px] shrink-0 sm:w-[390px] max-md:w-[calc(100vw-2.5rem)]"><MatchCard match={match} /></div>)}
          </HorizontalCarousel>
        ) : (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-5 text-sm text-white/62 backdrop-blur-2xl">{hasData ? "No live matches right now" : "Fixtures will appear soon"}</div>
        )}
      </div>
    </section>
  );
}

function Fixtures({ matches, hasData }: { matches: WorldCupMatch[]; hasData: boolean }) {
  const upcoming = useMemo(() => upcomingGroups(matches).flatMap((group) => group.matches), [matches]);

  return (
    <section className="px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Next window" title="Upcoming Fixtures" action="Next 2 days" />
        {upcoming.length > 0 ? (
          <HorizontalCarousel title="Upcoming Fixtures" className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3">
            {upcoming.map((match) => (
              <Link key={match.fixtureId} href={`/matches/${encodeURIComponent(match.fixtureId)}`} className="world-cup-fixture-card grid min-h-[132px] w-[min(86vw,520px)] shrink-0 snap-start gap-3 rounded-[22px] border border-white/12 bg-white/[0.065] p-4 backdrop-blur-2xl transition hover:border-white/22 hover:bg-white/[0.09] md:w-[520px] lg:w-[520px]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/44">{formatMatchDate(match.kickoffTimestamp)}</p>
                  <p className="mt-2 truncate text-sm font-semibold text-white">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                  <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-white/54"><MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{match.venue ?? "Stadium TBA"}</span></p>
                </div>
                <div className="flex items-center gap-2 self-end">
                  {isStartingSoon(match) ? <span className="rounded-full bg-yellow-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">Starting Soon</span> : null}
                  <span className="rounded-full bg-sky-400/18 px-2.5 py-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-300/30">{formatMatchTime(match.kickoffTimestamp)}</span>
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
        ) : (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-5 text-sm text-white/62 backdrop-blur-2xl">{hasData ? "Fixtures will appear soon" : "Fixtures will appear soon"}</div>
        )}
      </div>
    </section>
  );
}

const fallbackAvatar = "/brand/football-placeholder.svg";
const playerFallbackAvatar = "/default/player-avatar.png";

function handleStatImageError(event: SyntheticEvent<HTMLImageElement>, fallback = fallbackAvatar) {
  const image = event.currentTarget;
  if (image.src.endsWith(fallback)) return;
  image.src = fallback;
}

function PlayerStatItem({ stat }: { stat: WorldCupPlayerStat }) {
  return (
    <div className="relative min-h-[248px] w-[204px] shrink-0 snap-start rounded-[18px] border border-white/10 bg-black/24">
      <img src={stat.photo} alt="" onError={(event) => handleStatImageError(event, playerFallbackAvatar)} className="h-40 w-full rounded-t-[18px] object-cover object-top" />
      <div className="p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/12 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">#{stat.rank}</span>
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/58">
            <img src={stat.flag} alt="" onError={handleStatImageError} className="h-4 w-6 rounded-[3px] object-contain ring-1 ring-white/15" />
            <span className="truncate">{stat.country}</span>
          </div>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight tracking-normal text-white">{stat.name}</h3>
        <div className="mt-2 flex items-end gap-1.5">
          <span className="text-xl font-semibold tabular-nums text-white">{stat.goals}</span>
          <span className="pb-0.5 text-[11px] font-semibold text-white/58">Goals</span>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <article className="min-h-[266px] overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.065] p-4 backdrop-blur-2xl">
      <h3 className="text-lg font-semibold tracking-normal text-white">{title}</h3>
      <div className="mt-4">
        {empty ? (
          <div className="grid min-h-[176px] place-items-center rounded-[18px] border border-white/10 bg-black/24 px-4 text-center text-sm text-white/54">No stats available</div>
        ) : (
          <HorizontalCarousel title={title} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2">
            {children}
          </HorizontalCarousel>
        )}
      </div>
    </article>
  );
}

function WorldCupStatsSection() {
  const stats = useWorldCup2026Stats();
  const topScorers = stats.data?.topScorers ?? [];
  const showFallbackNote = stats.isError || Boolean(stats.data?.fallbackUsed || stats.data?.errors.length);
  const loading = stats.isLoading && !stats.data;

  return (
    <section className="px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-2xl font-semibold tracking-normal text-white sm:text-3xl">World Cup Stats</h2>
        {showFallbackNote ? <p className="mb-4 text-sm text-white/54">Live API stats are temporarily limited. Showing cached tournament data when available.</p> : null}
        <StatsCard title="Top Scorers" empty={!loading && topScorers.length === 0}>
          {loading ? <div className="grid min-h-[176px] w-full place-items-center text-sm text-white/54">Loading stats...</div> : topScorers.map((stat) => <PlayerStatItem key={`${stat.rank}-${stat.name}-goals`} stat={stat} />)}
        </StatsCard>
      </div>
    </section>
  );
}
function PastWinnersSection() {
  return (
    <section className="px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Tournament history" title="Past World Cup Winners" action="Cached dataset" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {worldCupWinners.map((winner) => (
            <article key={winner.year} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 backdrop-blur-2xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/44">{winner.year}</p>
                <p className="mt-1 text-base font-semibold text-white">{winner.winner}</p>
              </div>
              <img src={winner.flag} alt="" className="h-8 w-10 rounded-[5px] object-contain ring-1 ring-white/15" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function WorldCupHighlightsPage() {
  const highlights = useFifaWorldCupHighlights();
  const fixtures = useWorldCup2026Fixtures();
  const hub = fixtures.data;
  const allMatches = hub?.all ?? [];
  const hasWorldCupData = allMatches.length > 0;
  const worldCupHighlights = useMemo(() => (highlights.data ?? []).filter((item) => item.category === "fifa-world-cup-2026").slice(0, 20), [highlights.data]);

  return (
    <Shell>
      <main className="min-h-screen overflow-hidden bg-[#050507]">
        <Hero />
        <Scorecards matches={allMatches} loading={fixtures.isLoading} hasData={hasWorldCupData} />
        <Fixtures matches={allMatches} hasData={hasWorldCupData} />
        <WorldCupStatsSection />
        <PastWinnersSection />
        {highlights.isLoading ? (
          <section className="px-5 py-5 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl rounded-[22px] border border-white/10 bg-white/[0.06] px-5 py-6 text-sm text-white/62">Loading official FIFA highlights...</div></section>
        ) : highlights.isError ? (
          <section className="px-5 py-5 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl rounded-[22px] border border-white/10 bg-white/[0.06] px-5 py-6 text-sm text-white/62">Unable to load official FIFA highlights.</div></section>
        ) : worldCupHighlights.length > 0 ? (
          <HighlightRow title="FIFA World Cup Highlights" items={worldCupHighlights} initialCount={12} loadStep={8} variant="carousel" seeAllHref="/highlights/fifa-world-cup-2026" />
        ) : null}
      </main>
    </Shell>
  );
}







