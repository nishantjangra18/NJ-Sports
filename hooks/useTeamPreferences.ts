"use client";

import { useCallback, useEffect, useState } from "react";
import { type TeamPreferences } from "@/lib/teamPreferences";
import { saveUserProfilePreferences } from "@/lib/userProfileClient";
import { useAuth } from "@/hooks/useAuth";

const emptyPreferences: TeamPreferences = { internationalTeams: [], clubTeams: [] };

export function useTeamPreferences() {
  const auth = useAuth();
  const [preferences, setPreferences] = useState<TeamPreferences>(emptyPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    setPreferences(auth.user ? auth.preferences : emptyPreferences);
    setReady(true);
  }, [auth.ready, auth.user?.userId, auth.preferences.internationalTeams.join("|"), auth.preferences.clubTeams.join("|")]);

  const savePreferences = useCallback((nextPreferences: TeamPreferences) => {
    if (!auth.user) return;
    setPreferences(nextPreferences);
    void saveUserProfilePreferences(nextPreferences);
  }, [auth.user]);

  return { preferences, ready, savePreferences };
}
