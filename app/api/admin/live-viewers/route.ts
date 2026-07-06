import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/server";
import { LiveStreamSession } from "@/models/LiveStreamSession";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;
    if (auth.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectMongoDB();

    // Check sessions that updated lastActiveTime in the last 12 seconds
    const thresholdTime = new Date(Date.now() - 12 * 1000);

    const activeSessions = await LiveStreamSession.find({
      isActive: true,
      lastActiveTime: { $gte: thresholdTime }
    })
      .populate("userId", "name email")
      .sort({ lastActiveTime: -1 });

    const streamsMap: Record<string, {
      streamId: string;
      streamTitle: string;
      viewers: Array<{ id: string; name: string; email: string; lastActive: Date }>;
      count: number;
    }> = {};

    for (const session of activeSessions) {
      const user = session.userId as any;
      if (!user) continue;

      const streamId = session.streamId;
      if (!streamsMap[streamId]) {
        streamsMap[streamId] = {
          streamId,
          streamTitle: session.streamTitle || streamId,
          viewers: [],
          count: 0
        };
      }

      streamsMap[streamId].viewers.push({
        id: user._id.toString(),
        name: user.name || "N/A",
        email: user.email || "",
        lastActive: session.lastActiveTime
      });
      streamsMap[streamId].count += 1;
    }

    return NextResponse.json({
      streams: Object.values(streamsMap).sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to retrieve live viewers" },
      { status: 500 }
    );
  }
}
