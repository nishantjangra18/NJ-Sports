import { getStoredAuthToken } from "@/lib/auth/client";

export type ContinueWatchingItem = {
  videoId: string;
  title: string;
  thumbnail: string;
  url: string;
  duration: number;
  watchedTime: number;
  lastWatchedAt: number;
};

export const continueWatchingStorageKey = "nj-sports-continue-watching";
const completionBufferSeconds = 10;

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeItem(value: unknown): ContinueWatchingItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<ContinueWatchingItem>;
  if (!item.videoId || !item.title || !item.thumbnail || !item.url) return null;
  const duration = Math.max(0, normalizeNumber(item.duration));
  const watchedTime = Math.max(0, normalizeNumber(item.watchedTime));
  return {
    videoId: item.videoId,
    title: item.title,
    thumbnail: item.thumbnail,
    url: item.url,
    duration,
    watchedTime,
    lastWatchedAt: normalizeNumber(item.lastWatchedAt, Date.now())
  };
}

function emitItems(items: ContinueWatchingItem[]) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("continue-watching-updated", { detail: items }));
}

function authHeaders() {
  const token = getStoredAuthToken();
  return token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : null;
}

function normalizeItems(items: unknown[]) {
  return items
    .map(normalizeItem)
    .filter((item): item is ContinueWatchingItem => Boolean(item))
    .filter(isContinueWatchingItem)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export function isContinueWatchingItem(item: ContinueWatchingItem) {
  return item.watchedTime > 0 && item.duration > 0 && item.watchedTime < item.duration - completionBufferSeconds;
}

export function loadContinueWatchingItems() {
  return [] as ContinueWatchingItem[];
}

export async function fetchContinueWatchingItems() {
  if (!isBrowser()) return [] as ContinueWatchingItem[];
  const headers = authHeaders();
  if (!headers) return [];

  const response = await fetch("/api/user/watch-history", { headers, cache: "no-store" });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({})) as { items?: unknown[] };
  return normalizeItems(Array.isArray(data.items) ? data.items : []);
}

export function upsertContinueWatchingItem(item: ContinueWatchingItem) {
  if (!isBrowser()) return;
  const normalized = normalizeItem(item);
  const headers = authHeaders();
  if (!normalized || !headers) {
    emitItems([]);
    return;
  }

  void fetch("/api/user/watch-history/update", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      matchId: normalized.videoId,
      title: normalized.title,
      thumbnail: normalized.thumbnail,
      url: normalized.url,
      duration: normalized.duration,
      watchedTime: normalized.watchedTime,
      progress: normalized.duration > 0 ? normalized.watchedTime / normalized.duration : 0,
      remove: !isContinueWatchingItem(normalized)
    })
  })
    .then((response) => response.ok ? response.json() : null)
    .then((data: { items?: unknown[] } | null) => {
      if (Array.isArray(data?.items)) emitItems(normalizeItems(data.items));
    })
    .catch(() => undefined);
}

export function removeContinueWatchingItem(videoId: string) {
  if (!isBrowser()) return;
  const headers = authHeaders();
  if (!headers) {
    emitItems([]);
    return;
  }

  void fetch("/api/user/watch-history/update", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ matchId: videoId, remove: true })
  })
    .then((response) => response.ok ? response.json() : null)
    .then((data: { items?: unknown[] } | null) => emitItems(normalizeItems(Array.isArray(data?.items) ? data.items : [])))
    .catch(() => undefined);
}

export function buildResumeUrl(url: string, watchedTime: number) {
  const seconds = Math.max(0, Math.floor(watchedTime));
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("t", String(seconds));
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${seconds}`;
  }
}

export function getResumeTimeFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const raw = params.get("t") ?? params.get("start");
  const value = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function appendYouTubeStartParam(url: string, startTime: number) {
  if (startTime <= 0) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("start", String(Math.floor(startTime)));
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}start=${Math.floor(startTime)}`;
  }
}
