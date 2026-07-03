export type StreamedSport = {
  id: string;
  name: string;
};

export type StreamedTeam = {
  id?: string;
  name: string;
  badge?: string;
};

export type StreamedSource = {
  source: string;
  id: string;
};

export type StreamedMatch = {
  id: string;
  title: string;
  category?: string;
  competition?: string;
  sport?: string;
  date?: string;
  poster?: string;
  badge?: string;
  popular?: boolean;
  teams: StreamedTeam[];
  sources: StreamedSource[];
  live?: boolean;
};

export type StreamedStream = {
  id: string;
  source: string;
  embedUrl: string;
  serverName: string;
  language?: string;
  quality?: string;
  streamNumber?: number;
  raw?: unknown;
};

export type MatchCardView = {
  id: string;
  slug: string;
  title: string;
  competition: string;
  meta: string;
  image: string;
  thumbnail: string;

  live?: boolean;
  badge?: string;
  popularity?: number;
  teams: StreamedTeam[];
  sources: StreamedSource[];
  watchSource?: string;
  watchId?: string;
  href?: string;
  imageFallback?: string;
  youtubeId?: string;
  publishedAt?: string;
  fixtureId?: string;
};

export type ContentRowView = {
  title: string;
  items: MatchCardView[];
};

export type SearchResult = {
  id: string;
  label: string;
  type: "Match" | "Team" | "Competition" | "Sport";
  href?: string;
};

