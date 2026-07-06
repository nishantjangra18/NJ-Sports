"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Play,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Users
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type ActivityLog = {
  action: string;
  details: string;
  timestamp: string;
};

type WatchHistoryEntry = {
  matchId: string;
  title: string;
  thumbnail: string;
  url: string;
  progress: number;
  duration: number;
  watchedTime: number;
  lastWatchedAt: string | number;
};

type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  preferences: {
    internationalTeam: string;
    clubTeam: string;
  };
  watchHistory: WatchHistoryEntry[];
  activityLogs: ActivityLog[];
};

type AdminAnalytics = {
  totalUsers: number;
  activeUsers: number;
  engagementRate: number;
  averageWatched: number;
  trendingTeams: Array<{ name: string; count: number; type: string }>;
  trendingMatches: Array<{ id: string; title: string; count: number; thumbnail: string }>;
};

type AdminDataResponse = {
  users: UserDetail[];
  analytics: AdminAnalytics;
};

type TabType = "overview" | "users" | "audit" | "live";

function formatTimestamp(value?: string | number | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default function AdminPage() {
  const auth = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [data, setData] = useState<AdminDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);

  // 1. Authorization Guard
  useEffect(() => {
    if (auth.ready && (!auth.user || auth.user.role !== "admin")) {
      router.replace("/");
    }
  }, [auth.ready, auth.user, router]);

  // 2. Poll Live Viewers (every 5 seconds) when "live" tab is active
  useEffect(() => {
    if (activeTab !== "live" || !auth.token || auth.user?.role !== "admin") return;

    let active = true;

    const fetchLiveViewers = async () => {
      try {
        const response = await fetch("/api/admin/live-viewers", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Failed to load live viewers");
        const resData = await response.json();
        if (active) {
          setLiveStreams(resData.streams || []);
        }
      } catch (err) {
        console.error("Live viewers poll failed:", err);
      }
    };

    void fetchLiveViewers();
    const interval = window.setInterval(fetchLiveViewers, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeTab, auth.token, auth.user?.role]);

  // 2. Fetch User Logs & System Analytics
  const fetchAdminData = async () => {
    if (!auth.token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(response.status === 403 ? "Forbidden. Admin role required." : "Failed to load admin logs");
      }
      const resData = await response.json() as AdminDataResponse;
      setData(resData);
      if (resData.users.length > 0 && !selectedUserId) {
        setSelectedUserId(resData.users[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.ready && auth.user?.role === "admin" && auth.token) {
      void fetchAdminData();
    }
  }, [auth.ready, auth.user?.role, auth.token]);

  // Filters user directory by search keywords
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data.users;
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.preferences?.clubTeam || "").toLowerCase().includes(query) ||
        (u.preferences?.internationalTeam || "").toLowerCase().includes(query)
    );
  }, [data?.users, searchQuery]);

  const selectedUser = useMemo(() => {
    if (!data?.users || !selectedUserId) return null;
    return data.users.find((u) => u.id === selectedUserId) ?? null;
  }, [data?.users, selectedUserId]);

  if (!auth.ready || auth.isLoading || !auth.user || auth.user.role !== "admin") {
    return (
      <div className="grid h-screen w-screen place-items-center bg-[#0b0f1a] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-studio-accent" />
          <p className="text-sm font-semibold text-white/50 tracking-wider uppercase">Verifying Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <Shell immersive>
      <main className="min-h-screen bg-[#0b0f1a] px-5 py-8 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl pt-4 max-md:pt-2">
          {/* Header */}
          <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.12)]">
                <Shield className="h-3.5 w-3.5" /> Secure Admin Panel
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-normal text-white sm:text-4xl">Admin Control Center</h1>
              <p className="mt-1 text-sm text-studio-muted">Manage system users, audit tracking logs, and analyze metrics.</p>
            </div>
            {/* Actions */}
            <button
              onClick={() => router.push("/profile")}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-5 text-sm font-semibold transition hover:bg-white/[0.1]"
            >
              <User className="h-4 w-4" /> Go to Profile
            </button>
          </header>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center text-red-200">
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => void fetchAdminData()}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-[#0b0f1a] transition hover:scale-[1.01]"
              >
                Retry Load
              </button>
            </div>
          ) : loading ? (
            <div className="mt-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-studio-accent" />
              <p className="text-sm text-white/46 font-medium">Fetching statistics and audit logs...</p>
            </div>
          ) : (
            <div className="mt-8">
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b border-white/8 pb-3 max-md:overflow-x-auto">
                {([
                  { id: "overview", label: "Overview", icon: BarChart3 },
                  { id: "users", label: "Users Directory", icon: Users },
                  { id: "audit", label: "Audit Timeline", icon: Activity },
                  { id: "live", label: "Live Activity", icon: Play }
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex h-11 items-center gap-2.5 rounded-full px-5 text-sm font-semibold transition whitespace-nowrap",
                        active
                          ? "bg-white text-black shadow-premium"
                          : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Overview */}
              {activeTab === "overview" && data?.analytics && (
                <div className="mt-6 space-y-6">
                  {/* Analytic cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        title: "Total Users",
                        value: data.analytics.totalUsers,
                        sub: "Registered accounts",
                        icon: Users,
                        accent: "from-blue-500/10 to-indigo-500/10 border-blue-500/18 text-blue-300"
                      },
                      {
                        title: "Active Today",
                        value: data.analytics.activeUsers,
                        sub: `${data.analytics.engagementRate}% active this week`,
                        icon: Clock,
                        accent: "from-emerald-500/10 to-teal-500/10 border-emerald-500/18 text-emerald-300"
                      },
                      {
                        title: "Total Engagement",
                        value: `${data.analytics.engagementRate}%`,
                        sub: "Weekly active ratio",
                        icon: TrendingUp,
                        accent: "from-rose-500/10 to-pink-500/10 border-rose-500/18 text-rose-300"
                      },
                      {
                        title: "Watch Volume",
                        value: data.analytics.averageWatched,
                        sub: "Avg streams viewed / user",
                        icon: Play,
                        accent: "from-amber-500/10 to-orange-500/10 border-amber-500/18 text-amber-300"
                      }
                    ].map((card, i) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-premium",
                            card.accent
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold tracking-wide text-white/54">{card.title}</span>
                            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/8 border border-white/10">
                              <Icon className="h-4 w-4 text-white" />
                            </span>
                          </div>
                          <p className="mt-4 text-3xl font-black text-white">{card.value}</p>
                          <p className="mt-1 text-xs text-white/46">{card.sub}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Trending statistics lists */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Trending Teams */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-premium sm:p-6">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Globe className="h-5 w-5 text-indigo-400" /> Trending Team Preferences
                      </h3>
                      <p className="mt-1 text-xs text-white/42">Most popular club and international team selections.</p>
                      <div className="mt-5 space-y-3">
                        {data.analytics.trendingTeams.length > 0 ? (
                          data.analytics.trendingTeams.map((team, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 border border-white/6 hover:border-white/10 transition">
                              <div className="flex items-center gap-3">
                                <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-300">
                                  #{idx + 1}
                                </span>
                                <span className="text-sm font-bold text-white">{team.name}</span>
                                <span className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/46">
                                  {team.type}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-white/60">{team.count} follows</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-sm text-white/34">No preferences logged yet</div>
                        )}
                      </div>
                    </div>

                    {/* Trending Matches */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-premium sm:p-6">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Play className="h-5 w-5 text-rose-400" /> Most Watched Content
                      </h3>
                      <p className="mt-1 text-xs text-white/42">Matches with the highest frequency of user viewership.</p>
                      <div className="mt-5 space-y-3">
                        {data.analytics.trendingMatches.length > 0 ? (
                          data.analytics.trendingMatches.map((match, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 border border-white/6 hover:border-white/10 transition">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-xs font-bold text-rose-300">
                                  #{idx + 1}
                                </span>
                                {match.thumbnail && (
                                  <img src={match.thumbnail} alt="" className="h-8 w-12 rounded object-cover border border-white/10" />
                                )}
                                <span className="truncate text-sm font-semibold text-white">{match.title}</span>
                              </div>
                              <span className="shrink-0 text-xs font-bold text-white/60 pl-2">{match.count} views</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-sm text-white/34">No watch logs saved yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Users Directory */}
              {activeTab === "users" && (
                <div className="mt-6 space-y-4">
                  {/* Filter inputs */}
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users by name, email, or team preference..."
                      className="h-11 w-full rounded-full border border-white/10 bg-white/[0.05] pl-11 pr-4 text-sm outline-none transition placeholder:text-white/34 focus:border-white/20 focus:bg-white/[0.08]"
                    />
                  </div>

                  {/* Users table */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-premium">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.02]">
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-white/46 text-xs">User Details</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-white/46 text-xs">Role</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-white/46 text-xs">Team Preferences</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-white/46 text-xs">Joined Date</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-white/46 text-xs">Last Login</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-white/46 text-xs text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/6">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-white/[0.02] transition">
                                <td className="px-5 py-4.5">
                                  <div className="flex items-center gap-3">
                                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-sm font-bold text-white border border-white/10">
                                      {u.name ? u.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                                    </div>
                                    <div>
                                      <p className="font-bold text-white leading-snug">{u.name || "N/A"}</p>
                                      <p className="text-xs text-white/46 mt-0.5">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4.5">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                      u.role === "admin"
                                        ? "bg-red-500/16 text-red-200 border border-red-500/20"
                                        : "bg-white/8 text-white/60 border border-white/8"
                                    )}
                                  >
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-5 py-4.5 text-xs">
                                  <div className="space-y-1 font-semibold text-white/70">
                                    {u.preferences?.clubTeam && (
                                      <div><span className="text-white/34">Club:</span> {u.preferences.clubTeam}</div>
                                    )}
                                    {u.preferences?.internationalTeam && (
                                      <div><span className="text-white/34">National:</span> {u.preferences.internationalTeam}</div>
                                    )}
                                    {!u.preferences?.clubTeam && !u.preferences?.internationalTeam && (
                                      <span className="text-white/34">None</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4.5 text-xs text-white/54">
                                  {formatDateOnly(u.createdAt)}
                                </td>
                                <td className="px-5 py-4.5 text-xs text-white/54">
                                  {formatTimestamp(u.lastLogin)}
                                </td>
                                <td className="px-5 py-4.5 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedUserId(u.id);
                                      setActiveTab("audit");
                                    }}
                                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-white/[0.06] hover:bg-white/12 px-3 text-xs font-bold text-white transition"
                                  >
                                    Audit <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-sm text-white/34">
                                No users match this query
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: User Audit Timeline */}
              {activeTab === "audit" && (
                <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
                  {/* Selector panel */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-premium max-h-[70vh] overflow-y-auto space-y-1.5">
                    <h3 className="px-2 pb-3 pt-1 text-xs font-bold uppercase tracking-wider text-white/46">Audit User</h3>
                    {data?.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                          selectedUserId === u.id
                            ? "bg-white text-black shadow-premium"
                            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                        )}
                      >
                        <div className={cn("grid h-7 w-7 place-items-center rounded-full text-xs font-bold shrink-0", selectedUserId === u.id ? "bg-black/10 text-black" : "bg-white/8 text-white")}>
                          {u.name ? u.name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{u.name || "N/A"}</p>
                          <p className={cn("truncate text-[10px] mt-0.5", selectedUserId === u.id ? "text-black/54" : "text-white/38")}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Audit details timeline */}
                  <div className="space-y-6">
                    {selectedUser ? (
                      <>
                        {/* Profile Summary Card */}
                        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-5 shadow-premium sm:p-6 relative overflow-hidden">
                          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-400/12 blur-2xl" />
                          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/8 text-xl font-bold text-white border border-white/10 shadow-premium">
                                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-white">{selectedUser.name || "N/A"}</h3>
                                <p className="text-sm font-medium text-white/50">{selectedUser.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                              <div className="rounded-full bg-white/6 border border-white/8 px-3.5 py-1.5">
                                <span className="text-white/46">Joined:</span> <span className="text-white">{formatDateOnly(selectedUser.createdAt)}</span>
                              </div>
                              <div className="rounded-full bg-white/6 border border-white/8 px-3.5 py-1.5">
                                <span className="text-white/46">Role:</span> <span className="text-white capitalize">{selectedUser.role}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 border-t border-white/8 pt-5 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-white/42">Favorite Club Team</p>
                              <p className="mt-1 text-base font-bold text-white">{selectedUser.preferences?.clubTeam || "None selected"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-white/42">Favorite International Team</p>
                              <p className="mt-1 text-base font-bold text-white">{selectedUser.preferences?.internationalTeam || "None selected"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Watch History */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-premium sm:p-6">
                          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <Play className="h-5 w-5 text-cyan-400" /> Watch Progress History
                          </h3>
                          <p className="mt-1 text-xs text-white/42">Activity logs representing matched content and highlight views.</p>
                          <div className="mt-5 space-y-3">
                            {selectedUser.watchHistory && selectedUser.watchHistory.length > 0 ? (
                              selectedUser.watchHistory.map((item, idx) => {
                                const progressPct = Math.round(item.progress * 100);
                                return (
                                  <div key={idx} className="flex flex-col gap-3 rounded-xl bg-white/[0.03] p-4 border border-white/6 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {item.thumbnail && (
                                        <img src={item.thumbnail} alt="" className="h-10 w-16 rounded object-cover border border-white/10 shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-white/42">
                                          <span>Progress: {progressPct}%</span>
                                          <span>•</span>
                                          <span>Last: {formatTimestamp(item.lastWatchedAt)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                      <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden hidden sm:block">
                                        <div className="h-full bg-studio-accent rounded-full" style={{ width: `${progressPct}%` }} />
                                      </div>
                                      {item.url && (
                                        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/6 hover:bg-white/12 px-3.5 text-xs font-semibold text-white border border-white/8 transition">
                                          <ExternalLink className="h-3.5 w-3.5" /> View
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-8 text-center text-sm text-white/34">No watch logs in history</div>
                            )}
                          </div>
                        </div>

                        {/* Activity logs timeline */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-premium sm:p-6">
                          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <Activity className="h-5 w-5 text-emerald-400" /> Activity Log Timeline
                          </h3>
                          <p className="mt-1 text-xs text-white/42">Detailed audit logs representing user interactions.</p>
                          <div className="mt-6 relative border-l border-white/10 pl-5 ml-2.5 space-y-6">
                            {selectedUser.activityLogs && selectedUser.activityLogs.length > 0 ? (
                              selectedUser.activityLogs.map((log, idx) => (
                                <div key={idx} className="relative">
                                  {/* Bullet indicator */}
                                  <span className="absolute -left-[27px] top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#0b0f1a] border border-white/20">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  </span>
                                  <div>
                                    <span className="text-xs font-bold text-white/46 uppercase tracking-wider">
                                      {formatTimestamp(log.timestamp)}
                                    </span>
                                    <div className="mt-1 flex flex-wrap gap-2 items-center">
                                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/10">
                                        {log.action.replace("_", " ")}
                                      </span>
                                      <p className="text-sm font-semibold text-white/82">{log.details}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 text-center text-sm text-white/34 -ml-5">No activity logs recorded yet</div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-20 text-center text-sm text-white/34 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                        Select a user to review logs
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Live Activity */}
              {activeTab === "live" && (
                <div className="mt-6 space-y-6">
                  {/* Total counts header */}
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-premium sm:p-6">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Activity className="h-5 w-5 text-red-500 animate-pulse" /> Live Stream Monitor
                      </h3>
                      <p className="mt-1 text-xs text-white/42">Real-time status updates of matches currently being streamed.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">
                        {liveStreams.reduce((acc, curr) => acc + curr.count, 0)}
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/42">Active Viewers</p>
                    </div>
                  </div>

                  {/* List of active streams */}
                  <div className="space-y-4">
                    {liveStreams.length > 0 ? (
                      liveStreams.map((stream) => (
                        <div key={stream.streamId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-premium sm:p-6">
                          <div className="flex items-center justify-between border-b border-white/8 pb-4">
                            <div>
                              <h4 className="text-base font-bold text-white">{stream.streamTitle}</h4>
                              <p className="text-xs text-white/34 mt-0.5">Stream ID: <span className="font-mono">{stream.streamId}</span></p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/16 border border-red-500/20 px-3 py-1 text-xs font-bold text-red-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                              {stream.count} watching
                            </span>
                          </div>

                          {/* List of users */}
                          <div className="mt-4 space-y-3">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-white/46">Users Watching</h5>
                            <div className="divide-y divide-white/6">
                              {stream.viewers.map((viewer: any) => (
                                <div key={viewer.id} className="flex items-center justify-between py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-xs font-bold text-white border border-white/10">
                                      {viewer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-white">{viewer.name}</p>
                                      <p className="text-xs text-white/46">{viewer.email}</p>
                                    </div>
                                  </div>
                                  <div className="text-right text-xs text-white/54">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTimestamp(viewer.lastActive)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-sm text-white/34 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                        <p className="font-semibold text-white/46">No active streams monitored</p>
                        <p className="mt-1 text-xs text-white/34">Sessions will appear here automatically when users start streaming.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}
