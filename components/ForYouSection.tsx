"use client";

import { useMemo } from "react";
import { HighlightRow } from "@/components/HighlightRow";
import { useAuth } from "@/hooks/useAuth";
import { useTeamPreferences } from "@/hooks/useTeamPreferences";
import { getSelectedTeams, teamMatchesText } from "@/lib/teamPreferences";
import type { MatchCardView } from "@/services/api/types";
import type { OfficialHighlight } from "@/services/api/youtube";

type ForYouSectionProps = {
  liveMatches: MatchCardView[];
  fallbackMatches: MatchCardView[];
  highlights: OfficialHighlight[];
};

function highlightMentionsTeam(item: OfficialHighlight, team: string) {
  return teamMatchesText(team, item.title) || teamMatchesText(team, item.source) || teamMatchesText(team, item.channelTitle);
}

function uniqueHighlights(items: OfficialHighlight[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function ForYouSection({ highlights }: ForYouSectionProps) {
  const auth = useAuth();
  const { preferences, ready } = useTeamPreferences();
  const selectedTeams = useMemo(() => getSelectedTeams(preferences), [preferences]);

  const personalizedHighlights = useMemo(() => {
    const source = uniqueHighlights(highlights).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    if (!auth.user || !ready || selectedTeams.length === 0) return [];
    const filtered = source.filter((item) => selectedTeams.some((team) => highlightMentionsTeam(item, team)));
    return (filtered.length > 0 ? filtered : source).slice(0, 10);
  }, [auth.user, highlights, ready, selectedTeams]);

  if (!auth.user || !ready || selectedTeams.length === 0 || personalizedHighlights.length === 0) return null;

  return (
    <section className="py-1">
      <div className="px-5 pt-5 sm:px-8 lg:px-10 max-md:px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-white max-md:text-xl">For You</h2>
            <p className="mt-1 text-sm text-studio-muted">
              {`Highlight picks for ${selectedTeams.slice(0, 3).join(", ")}${selectedTeams.length > 3 ? " and more" : ""}`}
            </p>
          </div>
        </div>
      </div>
      <HighlightRow title="For You" items={personalizedHighlights} variant="carousel" showTitle={false} />
    </section>
  );
}
