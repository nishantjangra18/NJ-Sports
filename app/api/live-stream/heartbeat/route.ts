import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/server";
import { LiveStreamSession } from "@/models/LiveStreamSession";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const streamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
    const streamTitle = typeof body.streamTitle === "string" ? body.streamTitle.trim() : "";
    const status = typeof body.status === "string" ? body.status : "active";

    if (!streamId) {
      return NextResponse.json({ error: "streamId is required" }, { status: 400 });
    }

    await connectMongoDB();

    if (status === "inactive") {
      // User left the stream cleanly
      await LiveStreamSession.updateMany(
        { userId: auth.user._id, streamId },
        { isActive: false, lastActiveTime: new Date() }
      );
    } else {
      // User is actively watching, upsert/update session
      await LiveStreamSession.findOneAndUpdate(
        { userId: auth.user._id, streamId },
        {
          streamTitle: streamTitle || streamId,
          lastActiveTime: new Date(),
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}
