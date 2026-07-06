import { NextResponse } from "next/server";
import { logUserActivity, mapWatchHistory, requireAuth } from "@/lib/auth/server";

const maxItems = 30;
const completionBufferSeconds = 10;

type WatchHistoryEntry = {
  matchId: string;
  title: string;
  thumbnail: string;
  url: string;
  progress: number;
  duration: number;
  watchedTime: number;
  lastWatchedAt: Date;
};

function normalizeString(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const matchId = normalizeString(body.matchId ?? body.videoId, 180);
    if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

    const current: WatchHistoryEntry[] = Array.isArray(auth.user.watchHistory)
      ? auth.user.watchHistory
        .filter((item) => item.matchId !== matchId)
        .map((item) => ({
          matchId: item.matchId,
          title: item.title,
          thumbnail: item.thumbnail,
          url: item.url,
          progress: item.progress,
          duration: item.duration,
          watchedTime: item.watchedTime,
          lastWatchedAt: item.lastWatchedAt instanceof Date ? item.lastWatchedAt : new Date()
        }))
      : [];

    if (body.remove === true) {
      auth.user.set("watchHistory", current);
      await auth.user.save();
      return NextResponse.json({ items: mapWatchHistory(auth.user) });
    }

    const duration = normalizeNumber(body.duration);
    const watchedTime = normalizeNumber(body.watchedTime ?? body.progressSeconds);
    const progress = duration > 0 ? Math.min(1, watchedTime / duration) : normalizeNumber(body.progress);
    const shouldKeep = watchedTime > 0 && duration > 0 && watchedTime < duration - completionBufferSeconds;

    if (shouldKeep) {
      const title = normalizeString(body.title, 220);
      current.unshift({
        matchId,
        title,
        thumbnail: normalizeString(body.thumbnail, 1000),
        url: normalizeString(body.url, 1000),
        progress,
        duration,
        watchedTime,
        lastWatchedAt: new Date()
      });

      // Track log activity
      const isHighlight = matchId.startsWith("highlight:");
      const cleanMatchId = isHighlight ? matchId.replace("highlight:", "") : matchId;
      const action = isHighlight ? "highlight_interaction" : "watch_video";
      const actionText = isHighlight ? "Viewed highlight video" : "Started watching match";

      await logUserActivity(
        auth.user,
        action,
        `${actionText}: "${title}" (ID: ${cleanMatchId})`,
        matchId
      );
    }

    auth.user.set("watchHistory", current.slice(0, maxItems));
    await auth.user.save();

    return NextResponse.json({ items: mapWatchHistory(auth.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update watch history";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
