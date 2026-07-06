import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/server";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Secure Route - Verify authentication
    const auth = await requireAuth(request);
    if (auth.response) return auth.response;

    // 2. Secure Route - Enforce role-based access control (RBAC)
    if (auth.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectMongoDB();

    // 3. Retrieve all users (excluding passwords)
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    // 4. Calculate Analytics
    const totalUsers = users.length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = users.filter((u) => u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo).length;

    // Tally team preferences
    const teamCounts: Record<string, { name: string; count: number; type: string }> = {};
    for (const u of users) {
      if (u.preferences?.clubTeam) {
        const team = u.preferences.clubTeam;
        teamCounts[team] = { name: team, count: (teamCounts[team]?.count ?? 0) + 1, type: "Club" };
      }
      if (u.preferences?.internationalTeam) {
        const team = u.preferences.internationalTeam;
        teamCounts[team] = { name: team, count: (teamCounts[team]?.count ?? 0) + 1, type: "International" };
      }
    }
    const trendingTeams = Object.values(teamCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Tally watch history matches
    const matchCounts: Record<string, { id: string; title: string; count: number; thumbnail: string }> = {};
    let totalVideosWatched = 0;
    for (const u of users) {
      const history = u.watchHistory ?? [];
      totalVideosWatched += history.length;
      for (const item of history) {
        const id = item.matchId;
        if (!id) continue;
        matchCounts[id] = {
          id,
          title: item.title || "Match",
          count: (matchCounts[id]?.count ?? 0) + 1,
          thumbnail: item.thumbnail || ""
        };
      }
    }
    const trendingMatches = Object.values(matchCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageWatched = totalUsers > 0 ? Number((totalVideosWatched / totalUsers).toFixed(1)) : 0;

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        preferences: u.preferences,
        watchHistory: u.watchHistory,
        activityLogs: u.activityLogs
      })),
      analytics: {
        totalUsers,
        activeUsers,
        engagementRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        averageWatched,
        trendingTeams,
        trendingMatches
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retrieve admin data" }, { status: 500 });
  }
}
