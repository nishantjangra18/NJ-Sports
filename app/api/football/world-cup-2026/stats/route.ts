import { NextResponse } from "next/server";
import { getWorldCupStats } from "@/services/zafronixWorldCup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getWorldCupStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "s-maxage=600, stale-while-revalidate=300"
      }
    });
  } catch (error) {
    console.error("Zafronix World Cup stats failed", error);
    return NextResponse.json({ error: "Unable to load World Cup stats" }, { status: 500 });
  }
}
