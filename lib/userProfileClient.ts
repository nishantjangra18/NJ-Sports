import { type TeamPreferences } from "@/lib/teamPreferences";
import { fetchCurrentUser, getStoredAuthToken, getStoredAuthUser, saveProfilePreferences } from "@/lib/auth/client";

const emptyPreferences: TeamPreferences = { internationalTeams: [], clubTeams: [] };

export async function fetchUserProfilePreferences() {
  if (!getStoredAuthToken()) return emptyPreferences;
  const user = await fetchCurrentUser();
  if (!user) return emptyPreferences;
  return {
    internationalTeams: user.favoriteInternationalTeams ?? [],
    clubTeams: user.favoriteClubTeams ?? []
  } satisfies TeamPreferences;
}

export async function saveUserProfilePreferences(preferences: TeamPreferences) {
  if (!getStoredAuthToken()) throw new Error("Login required");
  await saveProfilePreferences(preferences);
}

export function getCurrentProfileUser() {
  return getStoredAuthUser();
}
