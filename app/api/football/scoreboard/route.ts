import { NextResponse } from "next/server";
import { getFootballScoreboard } from "@/services/api/football";

export const dynamic = "force-dynamic";

export async function GET() {
  const scoreboard = await getFootballScoreboard();
  return NextResponse.json(scoreboard, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
