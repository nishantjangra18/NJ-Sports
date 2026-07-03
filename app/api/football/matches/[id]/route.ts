import { NextResponse } from "next/server";
import { getFootballMatchCenter } from "@/services/api/football";

export const dynamic = "force-dynamic";

type MatchCenterRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: MatchCenterRouteProps) {
  const { id } = await params;

  try {
    const match = await getFootballMatchCenter(decodeURIComponent(id));

    if (!match) {
      return NextResponse.json({ error: "Unable to load match data" }, { status: 404 });
    }

    return NextResponse.json(match, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("API-Football match details failed", error);
    return NextResponse.json({ error: "Unable to load match data" }, { status: 503 });
  }
}
