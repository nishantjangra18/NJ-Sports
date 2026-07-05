import { NextResponse } from "next/server";
import { normalizeStringArray, requireAuth, serializeAuthUser } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const favoriteInternationalTeams = normalizeStringArray(body.favoriteInternationalTeams);
    const favoriteClubTeams = normalizeStringArray(body.favoriteClubTeams);
    const internationalTeam = favoriteInternationalTeams[0] ?? "";
    const clubTeam = favoriteClubTeams[0] ?? "";

    auth.user.preferences = { internationalTeam, clubTeam };
    auth.user.favoriteInternationalTeams = internationalTeam ? [internationalTeam] : [];
    auth.user.favoriteClubTeams = clubTeam ? [clubTeam] : [];
    auth.user.isProfileComplete = Boolean(internationalTeam || clubTeam || auth.user.profilePic);
    await auth.user.save();

    return NextResponse.json({ user: serializeAuthUser(auth.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save onboarding";
    const status = message.includes("MONGODB_URI") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
