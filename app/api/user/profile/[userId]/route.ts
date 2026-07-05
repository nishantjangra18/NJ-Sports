import { NextResponse } from "next/server";
import { requireAuth, serializeAuthUser } from "@/lib/auth/server";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const { userId } = await params;
    if (auth.user._id.toString() !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ user: serializeAuthUser(auth.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile preferences";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
