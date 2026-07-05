export type TeamPreferences = {
  internationalTeams: string[];
  clubTeams: string[];
};

export type TeamOption = {
  name: string;
  logo: string;
};

function flag(name: string, code: string): TeamOption {
  return { name, logo: `https://flagcdn.com/w80/${code}.png` };
}

const defaultClubLogo = "/logos/default.png";
const clubLogoCacheKey = "nj-sports-wikipedia-club-logo-cache";

const clubWikiTitles: Record<string, string> = {
  "Real Madrid": "Real Madrid CF",
  "Barcelona": "FC Barcelona",
  "Atletico Madrid": "Atletico Madrid",
  "Paris Saint-Germain": "Paris Saint-Germain F.C.",
  "Bayern Munich": "FC Bayern Munich",
  "Borussia Dortmund": "Borussia Dortmund",
  "Manchester City": "Manchester City F.C.",
  "Manchester United": "Manchester United F.C.",
  Liverpool: "Liverpool F.C.",
  Chelsea: "Chelsea F.C.",
  Arsenal: "Arsenal F.C.",
  "Tottenham Hotspur": "Tottenham Hotspur F.C.",
  "Newcastle United": "Newcastle United F.C.",
  Juventus: "Juventus FC",
  "Inter Milan": "Inter Milan",
  "AC Milan": "AC Milan",
  Napoli: "SSC Napoli",
  "AS Roma": "AS Roma",
  "Bayer Leverkusen": "Bayer 04 Leverkusen",
  "RB Leipzig": "RB Leipzig",
  Benfica: "S.L. Benfica",
  "FC Porto": "FC Porto",
  "Sporting CP": "Sporting CP",
  Ajax: "AFC Ajax",
  "PSV Eindhoven": "PSV Eindhoven",
  Feyenoord: "Feyenoord",
  Celtic: "Celtic F.C.",
  Rangers: "Rangers F.C.",
  Galatasaray: "Galatasaray S.K.",
  Fenerbahce: "Fenerbahce S.K.",
  "Inter Miami": "Inter Miami CF",
  "Inter Miami CF": "Inter Miami CF",
  "LA Galaxy": "LA Galaxy",
  "Los Angeles FC": "Los Angeles FC",
  "New York City FC": "New York City FC",
  "Atlanta United": "Atlanta United FC",
  "Seattle Sounders": "Seattle Sounders FC",
  "Toronto FC": "Toronto FC",
  "Al Nassr": "Al Nassr FC",
  "Al Hilal": "Al Hilal SFC",
  "Al Ittihad": "Al-Ittihad Club (Jeddah)",
  "Al Ahli Saudi": "Al-Ahli Saudi FC",
  "River Plate": "Club Atletico River Plate",
  "Boca Juniors": "Boca Juniors",
  Flamengo: "CR Flamengo",
  Palmeiras: "SE Palmeiras",
  Corinthians: "Sport Club Corinthians Paulista",
  Santos: "Santos FC",
  Monterrey: "C.F. Monterrey",
  "Club America": "Club America",
  Chivas: "C.D. Guadalajara"
};

function readClubLogoCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(clubLogoCacheKey);
    return stored ? JSON.parse(stored) as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeClubLogoCache(cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clubLogoCacheKey, JSON.stringify(cache));
  } catch {
    // Ignore storage failures; logo loading still falls back safely.
  }
}

export function normalizeClubWikiTitle(teamName: string) {
  const trimmed = teamName.trim().replace(/\s+/g, " ");
  const cleaned = trimmed.replace(/\b(CF|FC|SC)\b\.?/gi, "").replace(/\s+/g, " ").trim();
  return clubWikiTitles[trimmed] || clubWikiTitles[cleaned] || cleaned || trimmed;
}

function wikiTitlePath(teamName: string) {
  return encodeURIComponent(normalizeClubWikiTitle(teamName).replace(/\s+/g, "_"));
}

export function getClubLogo(teamName?: string) {
  if (!teamName) return defaultClubLogo;
  const cache = readClubLogoCache();
  const cached = cache[teamName];
  if (cached) return cached;
  const logoUrl = `https://en.wikipedia.org/wiki/Special:PageImage/${wikiTitlePath(teamName)}`;
  cache[teamName] = logoUrl;
  writeClubLogoCache(cache);
  return logoUrl;
}

export async function resolveClubLogoFromWikipedia(teamName?: string) {
  if (!teamName) return defaultClubLogo;
  const cache = readClubLogoCache();
  const cached = cache[`${teamName}:summary`];
  if (cached) return cached;

  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitlePath(teamName)}`);
    if (!response.ok) return defaultClubLogo;
    const data = await response.json() as { originalimage?: { source?: string }; thumbnail?: { source?: string } };
    const logoUrl = data.originalimage?.source || data.thumbnail?.source || defaultClubLogo;
    cache[`${teamName}:summary`] = logoUrl;
    writeClubLogoCache(cache);
    return logoUrl;
  } catch {
    return defaultClubLogo;
  }
}

export function getDefaultClubLogo() {
  return defaultClubLogo;
}

function club(name: string): TeamOption {
  return { name, logo: getClubLogo(name) };
}
export const internationalTeamOptions: TeamOption[] = [
  flag("India", "in"),
  flag("Brazil", "br"),
  flag("Argentina", "ar"),
  flag("France", "fr"),
  flag("Germany", "de"),
  flag("Spain", "es"),
  flag("Portugal", "pt"),
  flag("England", "gb-eng"),
  flag("Italy", "it"),
  flag("Netherlands", "nl"),
  flag("Belgium", "be"),
  flag("Croatia", "hr"),
  flag("Uruguay", "uy"),
  flag("Colombia", "co"),
  flag("Mexico", "mx"),
  flag("United States", "us"),
  flag("Canada", "ca"),
  flag("Japan", "jp"),
  flag("South Korea", "kr"),
  flag("Australia", "au"),
  flag("Morocco", "ma"),
  flag("Senegal", "sn"),
  flag("Nigeria", "ng"),
  flag("Ghana", "gh"),
  flag("Cameroon", "cm"),
  flag("Egypt", "eg"),
  flag("Algeria", "dz"),
  flag("Tunisia", "tn"),
  flag("Saudi Arabia", "sa"),
  flag("Qatar", "qa"),
  flag("Iran", "ir"),
  flag("Turkey", "tr"),
  flag("Switzerland", "ch"),
  flag("Austria", "at"),
  flag("Denmark", "dk"),
  flag("Sweden", "se"),
  flag("Norway", "no"),
  flag("Poland", "pl"),
  flag("Serbia", "rs"),
  flag("Czech Republic", "cz"),
  flag("Scotland", "gb-sct"),
  flag("Wales", "gb-wls"),
  flag("Ukraine", "ua"),
  flag("Ecuador", "ec"),
  flag("Chile", "cl"),
  flag("Peru", "pe"),
  flag("Paraguay", "py"),
  flag("Venezuela", "ve"),
  flag("Costa Rica", "cr"),
  flag("Panama", "pa")
];

export const clubTeamOptions: TeamOption[] = [
  club("Real Madrid"),
  club("Barcelona"),
  club("Atletico Madrid"),
  club("Paris Saint-Germain"),
  club("Bayern Munich"),
  club("Borussia Dortmund"),
  club("Manchester City"),
  club("Manchester United"),
  club("Liverpool"),
  club("Chelsea"),
  club("Arsenal"),
  club("Tottenham Hotspur"),
  club("Newcastle United"),
  club("Juventus"),
  club("Inter Milan"),
  club("AC Milan"),
  club("Napoli"),
  club("AS Roma"),
  club("Bayer Leverkusen"),
  club("RB Leipzig"),
  club("Benfica"),
  club("FC Porto"),
  club("Sporting CP"),
  club("Ajax"),
  club("PSV Eindhoven"),
  club("Feyenoord"),
  club("Celtic"),
  club("Rangers"),
  club("Galatasaray"),
  club("Fenerbahce"),
  club("Inter Miami"),
  club("LA Galaxy"),
  club("Los Angeles FC"),
  club("New York City FC"),
  club("Atlanta United"),
  club("Seattle Sounders"),
  club("Toronto FC"),
  club("Al Nassr"),
  club("Al Hilal"),
  club("Al Ittihad"),
  club("Al Ahli Saudi"),
  club("River Plate"),
  club("Boca Juniors"),
  club("Flamengo"),
  club("Palmeiras"),
  club("Corinthians"),
  club("Santos"),
  club("Monterrey"),
  club("Club America"),
  club("Chivas")
];

export const internationalTeams = internationalTeamOptions.map((team) => team.name);
export const clubTeams = clubTeamOptions.map((team) => team.name);

export const teamPreferencesStorageKey = "nj-sports-team-preferences";
export const teamPreferencesOnboardingKey = "nj-sports-team-preferences-onboarded";

export const defaultTeamPreferences: TeamPreferences = {
  internationalTeams: [],
  clubTeams: []
};

export function normalizeTeamPreferences(value: unknown): TeamPreferences {
  if (!value || typeof value !== "object") return defaultTeamPreferences;
  const candidate = value as Partial<TeamPreferences>;
  return {
    internationalTeams: Array.isArray(candidate.internationalTeams) ? candidate.internationalTeams.filter((team): team is string => typeof team === "string") : [],
    clubTeams: Array.isArray(candidate.clubTeams) ? candidate.clubTeams.filter((team): team is string => typeof team === "string") : []
  };
}

export function loadTeamPreferences(): TeamPreferences {
  if (typeof window === "undefined") return defaultTeamPreferences;
  try {
    const stored = window.localStorage.getItem(teamPreferencesStorageKey);
    return stored ? normalizeTeamPreferences(JSON.parse(stored)) : defaultTeamPreferences;
  } catch {
    return defaultTeamPreferences;
  }
}

export function saveTeamPreferences(preferences: TeamPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(teamPreferencesStorageKey, JSON.stringify(normalizeTeamPreferences(preferences)));
  window.localStorage.setItem(teamPreferencesOnboardingKey, "true");
  window.dispatchEvent(new CustomEvent("team-preferences-updated", { detail: normalizeTeamPreferences(preferences) }));
}

export function hasCompletedTeamPreferenceOnboarding() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(teamPreferencesOnboardingKey) === "true";
}

export function getSelectedTeams(preferences: TeamPreferences) {
  return [...preferences.internationalTeams, ...preferences.clubTeams];
}

export function teamMatchesText(team: string, value: string) {
  return value.toLowerCase().includes(team.toLowerCase());
}




