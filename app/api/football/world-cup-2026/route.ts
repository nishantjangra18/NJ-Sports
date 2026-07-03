import { NextResponse } from "next/server";
import { getWorldCup2026Fixtures, type WorldCupHubResponse } from "@/services/api/football";

export const dynamic = "force-dynamic";

function emptyWorldCupHub(reason: string): WorldCupHubResponse {
  return {
    worldCupId: "1",
    live: [],
    upcoming: [],
    finished: [],
    all: [],
    errors: [{ competition: "FIFA World Cup", competitionSlug: "fifa-world-cup", reason }],
    fetchedAt: new Date().toISOString()
  };
}

export async function GET() {
  try {
    const fixtures = await getWorldCup2026Fixtures();
    return NextResponse.json(fixtures, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("API-Football World Cup fixtures failed", error);
    return NextResponse.json(emptyWorldCupHub("Unable to load World Cup fixtures"), { status: 200 });
  }
}
