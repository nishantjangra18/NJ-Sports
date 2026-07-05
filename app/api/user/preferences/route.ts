import { NextResponse } from "next/server";
import { requireAuth, serializeAuthUser } from "@/lib/auth/server";

function firstTeam(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 120);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;
    return NextResponse.json({
      preferences: auth.user.preferences ?? { internationalTeam: "", clubTeam: "" },
      user: serializeAuthUser(auth.user)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load preferences";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const internationalTeam = firstTeam(body.internationalTeam ?? body.preferences?.internationalTeam);
    const clubTeam = firstTeam(body.clubTeam ?? body.preferences?.clubTeam);

    auth.user.preferences = { internationalTeam, clubTeam };
    auth.user.favoriteInternationalTeams = internationalTeam ? [internationalTeam] : [];
    auth.user.favoriteClubTeams = clubTeam ? [clubTeam] : [];
    auth.user.isProfileComplete = Boolean(internationalTeam || clubTeam || auth.user.profileImage || auth.user.profilePic || auth.user.avatar);
    await auth.user.save();

    return NextResponse.json({
      preferences: auth.user.preferences,
      user: serializeAuthUser(auth.user)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save preferences";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
