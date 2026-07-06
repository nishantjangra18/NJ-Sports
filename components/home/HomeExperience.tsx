"use client";

import { useMemo } from "react";
import { ContentRow, ContentRowSkeleton } from "@/components/ContentRow";
import { ContinueWatchingSection } from "@/components/ContinueWatchingSection";
import { ForYouSection } from "@/components/ForYouSection";
import { Hero } from "@/components/Hero";
import { HighlightRow } from "@/components/HighlightRow";
import { LiveScoresSection } from "@/components/LiveScoresSection";
import { MlsHighlightsSection } from "@/components/MlsHighlightsSection";
import { Shell } from "@/components/Shell";
import { useHighlightCompetitions, useHomeData } from "@/hooks/useStreamedData";
import { useTeamPreferences } from "@/hooks/useTeamPreferences";
import { highlightToHeroCard } from "@/services/api/youtube";

function getActiveCategories(selectedInternationalTeams: string[], selectedClubTeams: string[]): Set<"mls" | "ucl" | "international"> {
  const categories = new Set<"mls" | "ucl" | "international">();

  if (selectedInternationalTeams.length > 0) {
    categories.add("international");
  }

  for (const team of selectedClubTeams) {
    if (
      team === "Inter Miami" ||
      team === "Inter Miami CF" ||
      team === "LA Galaxy" ||
      team === "Los Angeles FC" ||
      team === "New York City FC" ||
      team === "Atlanta United" ||
      team === "Seattle Sounders" ||
      team === "Toronto FC"
    ) {
      categories.add("mls");
    } else {
      categories.add("ucl");
    }
  }

  return categories;
}

export function HomeExperience() {
  const { liveMatches, rows, isLoading, isError, retry } = useHomeData();
  const competitions = useHighlightCompetitions();
  const { preferences, ready } = useTeamPreferences();
  const liveRow = rows.find((row) => row.title === "Live Football");

  const activeCategories = useMemo(() => {
    if (!ready || (preferences.internationalTeams.length === 0 && preferences.clubTeams.length === 0)) {
      return new Set<"mls" | "ucl" | "international">(["mls", "ucl", "international"]);
    }
    return getActiveCategories(preferences.internationalTeams, preferences.clubTeams);
  }, [preferences, ready]);

  const highlightItems = useMemo(() => (competitions.data ?? []).flatMap((competition) => competition.items), [competitions.data]);
  const latestHighlightCards = useMemo(() => [...highlightItems]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 7)
    .map(highlightToHeroCard), [highlightItems]);
  const heroSlides = useMemo(() => (liveMatches.length > 0 ? [liveMatches[0], ...latestHighlightCards.slice(0, 6)] : latestHighlightCards.slice(0, 6)), [latestHighlightCards, liveMatches]);
  const heroIsLoading = heroSlides.length === 0 && (isLoading || competitions.isLoading);
  const forYouSection = <ForYouSection liveMatches={liveMatches} fallbackMatches={liveRow?.items ?? []} highlights={highlightItems} />;

  return (
    <Shell>
      <Hero slides={heroSlides} isLoading={heroIsLoading} />
      <ContinueWatchingSection />
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
              {forYouSection}
              {(competitions.data ?? [])
                .filter((comp) => {
                  if (comp.id === "fifa-world-cup-2026") return activeCategories.has("international");
                  if (comp.id === "uefa-champions-league") return activeCategories.has("ucl");
                  return true;
                })
                .map((competition) => (
                  <HighlightRow key={competition.id} title={competition.title} items={competition.items} variant="carousel" seeAllHref={competition.href} />
                ))}
              {activeCategories.has("mls") ? <MlsHighlightsSection /> : null}
            </div>
            <div className="md:hidden">
              {liveRow ? <ContentRow title={liveRow.title} items={liveRow.items} /> : null}
              {forYouSection}
              {(competitions.data ?? [])
                .filter((comp) => {
                  if (comp.id === "fifa-world-cup-2026") return activeCategories.has("international");
                  if (comp.id === "uefa-champions-league") return activeCategories.has("ucl");
                  return true;
                })
                .map((competition) => (
                  <HighlightRow key={competition.id} title={competition.title} items={competition.items} variant="carousel" seeAllHref={competition.href} />
                ))}
              {activeCategories.has("mls") ? <MlsHighlightsSection /> : null}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
