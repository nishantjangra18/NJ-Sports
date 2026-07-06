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

import { useMls2026Highlights } from "@/hooks/useStreamedData";

function getHighlightCategory(item: OfficialHighlight): "mls" | "ucl" | "international" | null {
  if (item.category === "mls-2026" || item.source?.toLowerCase() === "mls" || item.title.toLowerCase().includes("mls") || item.channelTitle?.toLowerCase().includes("mls")) {
    return "mls";
  }
  if (item.category === "fifa-world-cup-2026" || item.source?.toLowerCase() === "fifa" || item.title.toLowerCase().includes("world cup") || item.title.toLowerCase().includes("fifa")) {
    return "international";
  }
  if (item.category === "uefa-champions-league" || item.source?.toLowerCase() === "ucl" || item.title.toLowerCase().includes("champions league") || item.title.toLowerCase().includes("ucl")) {
    return "ucl";
  }
  return null;
}

export function ForYouSection({ highlights: passedHighlights }: ForYouSectionProps) {
  const auth = useAuth();
  const { preferences, ready } = useTeamPreferences();
  const mlsHighlights = useMls2026Highlights();
  const selectedTeams = useMemo(() => getSelectedTeams(preferences), [preferences]);

  // Determine active preference categories using strict mapping rules (e.g. Inter Miami CF/Inter Miami -> mls)
  const activeCategories = useMemo(() => {
    const categories = new Set<"mls" | "ucl" | "international">();
    if (!ready) return categories;

    if (preferences.internationalTeams.length > 0) {
      categories.add("international");
    }

    for (const team of preferences.clubTeams) {
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
  }, [preferences, ready]);

  const personalizedHighlights = useMemo(() => {
    if (!auth.user || !ready || selectedTeams.length === 0 || activeCategories.size === 0) return [];

    // Tag and combine all highlight pools
    const mlsList = (mlsHighlights.data ?? []).map(item => ({
      ...item,
      category: "mls-2026" as const,
      source: item.source || "mls"
    }));

    const allHighlights = uniqueHighlights([...passedHighlights, ...mlsList]);

    // 1. Fetch all highlights in user's selected categories
    const categoryFiltered = allHighlights.filter((item) => {
      const cat = getHighlightCategory(item);
      return cat && activeCategories.has(cat);
    });

    // 2. Refine category-filtered highlights using team mentions (secondary filter)
    const teamMatched = categoryFiltered.filter((item) =>
      selectedTeams.some((team) => highlightMentionsTeam(item, team))
    );

    // 3. Fallback: If no matches are found, return all highlights in that category as a fallback guarantee
    const finalSelection = teamMatched.length > 0 ? teamMatched : categoryFiltered;

    return finalSelection
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, 10);
  }, [auth.user, passedHighlights, mlsHighlights.data, ready, selectedTeams, activeCategories]);

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
