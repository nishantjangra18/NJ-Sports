"use client";

import { useMemo } from "react";
import { ContentRow, ContentRowSkeleton } from "@/components/ContentRow";
import { Hero } from "@/components/Hero";
import { HighlightRow } from "@/components/HighlightRow";
import { LiveScoresSection } from "@/components/LiveScoresSection";
import { Shell } from "@/components/Shell";
import { useHighlightCompetitions, useHomeData } from "@/hooks/useStreamedData";
import { highlightToHeroCard } from "@/services/api/youtube";
export function HomeExperience() {
  const { liveMatches, rows, isLoading, isError, retry } = useHomeData();
  const competitions = useHighlightCompetitions();
  const liveRow = rows.find((row) => row.title === "Live Football");
  const latestHighlightCards = useMemo(() => (competitions.data ?? [])
    .flatMap((competition) => competition.items)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 4)
    .map(highlightToHeroCard), [competitions.data]);
  const heroSlides = useMemo(() => (liveMatches.length > 0 ? [liveMatches[0], ...latestHighlightCards.slice(0, 3)] : latestHighlightCards), [latestHighlightCards, liveMatches]);
  const heroIsLoading = heroSlides.length === 0 && (isLoading || competitions.isLoading);

  return (
    <Shell>
      <Hero slides={heroSlides} isLoading={heroIsLoading} />
      <LiveScoresSection liveMatches={liveMatches} />
      <div className="pb-12 pt-5 max-md:pt-1">
        {isError ? (
          <section className="px-5 py-5 sm:px-8 lg:px-10">
            <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-8">
              <h2 className="text-xl font-semibold tracking-normal text-white">Unable to load football matches</h2>
              <p className="mt-2 text-sm text-studio-muted">Please try again in a moment.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                Retry
              </button>
            </div>
          </section>
        ) : isLoading ? (
          <ContentRowSkeleton title="Live Football" />
        ) : (
          <>
            <div className="hidden md:block">
              {liveRow ? <ContentRow title={liveRow.title} items={liveRow.items} /> : null}
              {(competitions.data ?? []).map((competition) => (
                <HighlightRow key={competition.id} title={competition.title} items={competition.items} variant="carousel" seeAllHref={competition.href} />
              ))}
            </div>
            <div className="md:hidden">
              {liveRow ? <ContentRow title={liveRow.title} items={liveRow.items} /> : null}
              {(competitions.data ?? []).map((competition) => (
                <HighlightRow key={competition.id} title={competition.title} items={competition.items} variant="carousel" seeAllHref={competition.href} />
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
