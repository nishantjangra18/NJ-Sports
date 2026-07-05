"use client";

import { ContentRow, ContentRowSkeleton } from "@/components/ContentRow";
import { HighlightRow } from "@/components/HighlightRow";
import { MlsHighlightsSection } from "@/components/MlsHighlightsSection";
import { Shell } from "@/components/Shell";
import { useAllMatches, useHighlightCompetitions, useLiveMatches, useTodayMatches } from "@/hooks/useStreamedData";
import { createLiveFootballCards, toMatchCard } from "@/services/api/streamed";

type FeedPageExperienceProps = {
  title: string;
  emptyLabel: string;
  mode: "live" | "sport" | "highlights";
};

export function FeedPageExperience({ title, emptyLabel, mode }: FeedPageExperienceProps) {
  const live = useLiveMatches();
  const competitions = useHighlightCompetitions();
  const today = useTodayMatches();
  const all = useAllMatches();
  const needsAllFeeds = mode !== "highlights";
  const isLoading = mode === "highlights" ? competitions.isLoading : live.isLoading || today.isLoading || all.isLoading;
  const isError = mode === "highlights" ? competitions.isError : live.isError || today.isError || all.isError;
  const retry = () => {
    void live.refetch();
    if (needsAllFeeds) {
      void today.refetch();
      void all.refetch();
    }
  };

  const liveMatches = live.data ?? [];
  const todayMatches = today.data ?? [];
  const allMatches = all.data ?? [];
  const liveRow = { title: "Live Football", items: createLiveFootballCards(liveMatches, todayMatches, allMatches) };
  const footballHighlights = [...todayMatches, ...allMatches].map(toMatchCard);

  return (
    <Shell>
      <div className="pb-12 pt-8">
        {isError ? (
          <section className="px-5 py-5 sm:px-8 lg:px-10">
            <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-8">
              <h2 className="text-xl font-semibold tracking-normal text-white">Unable to load {title.toLowerCase()}</h2>
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
          <>
            <ContentRowSkeleton title="Live Football" />
            {mode === "sport" ? <ContentRowSkeleton title="Football Highlights" /> : null}
          </>
        ) : mode === "highlights" ? (
          <>
            {(competitions.data ?? []).map((competition) => (
              <HighlightRow key={competition.id} title={competition.title} items={competition.items} variant="carousel" seeAllHref={competition.href} />
            ))}
            <MlsHighlightsSection />
          </>
        ) : mode === "sport" ? (
          <>
            <ContentRow title={liveRow.title} items={liveRow.items} />
            {(competitions.data ?? []).map((competition) => (
              <HighlightRow key={competition.id} title={competition.title} items={competition.items} variant="carousel" seeAllHref={competition.href} />
            ))}
            <MlsHighlightsSection />
            <ContentRow title="All Football Highlights" items={footballHighlights} />
          </>
        ) : liveRow.items.length > 0 ? (
          <ContentRow title={liveRow.title} items={liveRow.items} />
        ) : (
          <section className="px-5 py-5 sm:px-8 lg:px-10">
            <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-8 text-sm text-studio-muted">{emptyLabel}</div>
          </section>
        )}
      </div>
    </Shell>
  );
}
