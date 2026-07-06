import { saveTeamPreferences, type TeamPreferences } from "@/lib/teamPreferences";

export type ClientUser = {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  profilePic: string;
  profileImage?: string;
  role?: string;
  preferences: {
    internationalTeam: string;
    clubTeam: string;
  };
  favoriteInternationalTeams: string[];
  favoriteClubTeams: string[];
  isProfileComplete: boolean;
  watchHistory?: Array<{
    videoId: string;
    title: string;
    thumbnail: string;
    url: string;
    duration: number;
    watchedTime: number;
    lastWatchedAt: number;
  }>;
};

type AuthResponse = {
  token?: string;
  user?: ClientUser | null;
  error?: string;
};

export const authTokenStorageKey = "nj-sports-auth-token";
export const authUserStorageKey = "nj-sports-auth-user";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredAuthToken() {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(authTokenStorageKey) ?? "";
}

export function getStoredAuthUser(): ClientUser | null {
  if (!isBrowser()) return null;
  try {
    const stored = window.localStorage.getItem(authUserStorageKey);
    return stored ? JSON.parse(stored) as ClientUser : null;
  } catch {
    return null;
  }
}

function emptyPreferences(): TeamPreferences {
  return { internationalTeams: [], clubTeams: [] };
}

function preferencesFromUser(user: ClientUser): TeamPreferences {
  return {
    internationalTeams: user.favoriteInternationalTeams?.length ? user.favoriteInternationalTeams : user.preferences?.internationalTeam ? [user.preferences.internationalTeam] : [],
    clubTeams: user.favoriteClubTeams?.length ? user.favoriteClubTeams : user.preferences?.clubTeam ? [user.preferences.clubTeam] : []
  };
}

export function storeAuthSession(token: string, user: ClientUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(authTokenStorageKey, token);
  window.localStorage.setItem(authUserStorageKey, JSON.stringify(user));
  saveTeamPreferences(preferencesFromUser(user));
  window.dispatchEvent(new CustomEvent("auth-session-updated", { detail: user }));
}

export function storeAuthUser(user: ClientUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(authUserStorageKey, JSON.stringify(user));
  saveTeamPreferences(preferencesFromUser(user));
  window.dispatchEvent(new CustomEvent("auth-session-updated", { detail: user }));
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(authTokenStorageKey);
  window.localStorage.removeItem(authUserStorageKey);
  window.dispatchEvent(new CustomEvent("auth-session-updated", { detail: null }));
  window.dispatchEvent(new CustomEvent("continue-watching-updated", { detail: [] }));
}

async function parseAuthResponse(response: Response): Promise<ClientUser> {
  const data = await response.json().catch(() => ({})) as AuthResponse;
  if (!response.ok) throw new Error(data.error || "Authentication failed");
  if (!data.token || !data.user) throw new Error("Invalid authentication response");
  storeAuthSession(data.token, data.user);
  const freshUser = await fetchCurrentUser();
  return freshUser ?? data.user;
}

export async function registerUser(payload: { name: string; email: string; password: string }): Promise<ClientUser> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  return parseAuthResponse(response);
}

export async function loginUser(payload: { email: string; password: string }): Promise<ClientUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  return parseAuthResponse(response);
}

export async function fetchCurrentUser(): Promise<ClientUser | null> {
  const token = getStoredAuthToken();
  const storedUser = getStoredAuthUser();
  if (!token) return null;

  const response = await fetch("/api/auth/me", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    clearAuthSession();
    return null;
  }
  if (!response.ok) return storedUser;

  const data = await response.json() as AuthResponse;
  if (!data.user) return storedUser;
  storeAuthUser(data.user);
  return data.user;
}

export async function saveProfilePreferences(preferences: TeamPreferences): Promise<ClientUser | null> {
  const token = getStoredAuthToken();
  if (!token) throw new Error("Login required");

  const internationalTeam = preferences.internationalTeams[0] ?? "";
  const clubTeam = preferences.clubTeams[0] ?? "";
  const response = await fetch("/api/user/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ internationalTeam, clubTeam })
  });

  const data = await response.json().catch(() => ({})) as AuthResponse;
  if (!response.ok) throw new Error(data.error || "Unable to save profile preferences");
  if (data.user) storeAuthUser(data.user);
  return data.user ?? getStoredAuthUser();
}

export async function saveProfileDetails(payload: { name: string; profilePic?: File | null; internationalTeam?: string; clubTeam?: string }): Promise<ClientUser> {
  const token = getStoredAuthToken();
  if (!token) throw new Error("Login required");

  const formData = new FormData();
  formData.append("name", payload.name);
  if (payload.profilePic) formData.append("profilePic", payload.profilePic);
  formData.append("internationalTeam", payload.internationalTeam ?? "");
  formData.append("clubTeam", payload.clubTeam ?? "");

  const response = await fetch("/api/user/profile", {
    method: "PUT",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    body: formData
  });

  const data = await response.json().catch(() => ({})) as AuthResponse;
  if (!response.ok) throw new Error(data.error || "Unable to save profile");
  if (!data.user) throw new Error("Invalid profile response");
  storeAuthUser(data.user);
  const freshUser = await fetchCurrentUser();
  return freshUser ?? data.user;
}

export function authUserToPreferences(user: ClientUser | null): TeamPreferences {
  if (!user) return emptyPreferences();
  return preferencesFromUser(user);
}
