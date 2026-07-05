"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { Check, Search } from "lucide-react";
import {
  clubTeamOptions,
  defaultTeamPreferences,
  getDefaultClubLogo,
  internationalTeamOptions,
  resolveClubLogoFromWikipedia,
  type TeamOption,
  type TeamPreferences
} from "@/lib/teamPreferences";
import { cn } from "@/lib/utils";

type PreferenceDraft = {
  internationalTeam: string;
  clubTeam: string;
};

type TeamPreferencesPanelProps = {
  initialPreferences?: TeamPreferences;
  onSave: (preferences: TeamPreferences) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  internationalTeamOptions?: TeamOption[];
  clubTeamOptions?: TeamOption[];
};

type TeamSelectorProps = {
  label: string;
  placeholder: string;
  value: string;
  options: TeamOption[];
  onSelect: (team: string) => void;
};

function toDraft(preferences: TeamPreferences): PreferenceDraft {
  return {
    internationalTeam: preferences.internationalTeams[0] ?? "",
    clubTeam: preferences.clubTeams[0] ?? ""
  };
}

function useDebouncedValue(value: string, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function TeamLogo({ team }: { team: TeamOption }) {
  function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (image.dataset.logoFallback === "default") return;
    image.dataset.logoFallback = "default";

    void resolveClubLogoFromWikipedia(team.name).then((logo) => {
      image.src = logo || getDefaultClubLogo();
    }).catch(() => {
      image.src = getDefaultClubLogo();
    });
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.08]">
      <img src={team.logo} alt="" onError={handleLogoError} className="h-6 w-6 rounded-full object-contain" loading="lazy" />
    </span>
  );
}

function TeamSelector({ label, placeholder, value, options, onSelect }: TeamSelectorProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 6);
    return options.filter((team) => team.name.toLowerCase().includes(normalizedQuery)).slice(0, 8);
  }, [normalizedQuery, options]);

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/54">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
        <input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(true);
            if (!nextQuery.trim()) onSelect("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.055] pl-11 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/34 focus:border-white/28 focus:bg-white/[0.08]"
          autoComplete="off"
        />
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#121212] p-1 shadow-premium">
          {visibleOptions.length > 0 ? (
            visibleOptions.map((team) => {
              const selected = team.name === value;
              return (
                <button
                  key={team.name}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(team.name);
                    setQuery(team.name);
                    setOpen(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/82 transition hover:bg-white/[0.08]"
                >
                  <TeamLogo team={team} />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-studio-accent" /> : null}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-5 text-sm text-white/46">No teams found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function TeamPreferencesPanel({
  initialPreferences = defaultTeamPreferences,
  onSave,
  title = "Profile preferences",
  description = "Choose the teams you follow. This is optional and can be changed anytime.",
  actionLabel = "Save Preferences",
  internationalTeamOptions: internationalOptions = internationalTeamOptions,
  clubTeamOptions: clubOptions = clubTeamOptions
}: TeamPreferencesPanelProps) {
  const [draft, setDraft] = useState<PreferenceDraft>(() => toDraft(initialPreferences));

  useEffect(() => {
    setDraft(toDraft(initialPreferences));
  }, [initialPreferences]);

  const selectedCount = Number(Boolean(draft.internationalTeam)) + Number(Boolean(draft.clubTeam));

  function saveDraft() {
    onSave({
      internationalTeams: draft.internationalTeam ? [draft.internationalTeam] : [],
      clubTeams: draft.clubTeam ? [draft.clubTeam] : []
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 shadow-premium sm:p-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/58">{description}</p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <TeamSelector
          label="International Team"
          placeholder="Search international team..."
          value={draft.internationalTeam}
          options={internationalOptions}
          onSelect={(team) => setDraft((current) => ({ ...current, internationalTeam: team }))}
        />
        <TeamSelector
          label="Club Team"
          placeholder="Search club team..."
          value={draft.clubTeam}
          options={clubOptions}
          onSelect={(team) => setDraft((current) => ({ ...current, clubTeam: team }))}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn("text-sm", selectedCount > 0 ? "text-white/58" : "text-white/42")}>{selectedCount > 0 ? `${selectedCount} selected` : "Preferences are optional"}</p>
        <button
          type="button"
          onClick={saveDraft}
          className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.02] active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}



