"use client";

import { HighlightRow } from "@/components/HighlightRow";
import { Shell } from "@/components/Shell";
import { useHighlightCompetitions } from "@/hooks/useStreamedData";
import type { HighlightCategory } from "@/services/api/youtube";

export function CompetitionHighlightsPage({ category }: { category: HighlightCategory }) {
  const competitions = useHighlightCompetitions();
  const competition = competitions.data?.find((item) => item.id === category);

  return (
    <Shell>
      <div className="pb-12 pt-8">
        {competitions.isLoading ? (
          <section className="px-5 py-5 sm:px-8 lg:px-10">
            <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-6 text-sm text-studio-muted">Loading highlights...</div>
          </section>
        ) : competitions.isError ? (
          <section className="px-5 py-5 sm:px-8 lg:px-10">
            <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-6 text-sm text-studio-muted">Unable to load highlights.</div>
          </section>
        ) : competition ? (
          <HighlightRow title={competition.title} items={competition.items} initialCount={12} loadStep={12} variant="grid" />
        ) : null}
      </div>
    </Shell>
  );
}