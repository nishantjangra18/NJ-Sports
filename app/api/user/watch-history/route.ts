import { NextResponse } from "next/server";
import { mapWatchHistory, requireAuth } from "@/lib/auth/server";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;
    return NextResponse.json({ items: mapWatchHistory(auth.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load watch history";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
