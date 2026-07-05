"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  authUserToPreferences,
  clearAuthSession,
  fetchCurrentUser,
  getStoredAuthUser,
  loginUser,
  registerUser,
  saveProfileDetails,
  type ClientUser
} from "@/lib/auth/client";
import type { TeamPreferences } from "@/lib/teamPreferences";

type AuthContextValue = {
  user: ClientUser | null;
  token: string;
  ready: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  preferences: TeamPreferences;
  watchHistory: NonNullable<ClientUser["watchHistory"]>;
  login: (payload: { email: string; password: string }) => Promise<ClientUser>;
  register: (payload: { name: string; email: string; password: string }) => Promise<ClientUser>;
  updateProfile: (payload: { name: string; profilePic?: File | null; internationalTeam?: string; clubTeam?: string }) => Promise<ClientUser>;
  refreshUser: () => Promise<ClientUser | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("nj-sports-auth-token") ?? "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(() => getStoredAuthUser());
  const [token, setToken] = useState(() => getToken());
  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    setToken(getToken());
    return currentUser;
  }, []);

  useEffect(() => {
    let mounted = true;
    setUser(getStoredAuthUser());
    setToken(getToken());
    void fetchCurrentUser().then((currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      setToken(getToken());
      setReady(true);
    }).catch(() => {
      if (!mounted) return;
      setToken(getToken());
      setReady(true);
    });

    const handleAuthUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ClientUser | null>;
      setUser(customEvent.detail ?? getStoredAuthUser());
      setToken(getToken());
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("nj-sports-auth")) {
        setUser(getStoredAuthUser());
        setToken(getToken());
      }
    };

    window.addEventListener("auth-session-updated", handleAuthUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      mounted = false;
      window.removeEventListener("auth-session-updated", handleAuthUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const nextUser = await loginUser(payload);
      setUser(nextUser);
      setToken(getToken());
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: { name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const nextUser = await registerUser(payload);
      setUser(nextUser);
      setToken(getToken());
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload: { name: string; profilePic?: File | null; internationalTeam?: string; clubTeam?: string }) => {
    setIsLoading(true);
    try {
      const nextUser = await saveProfileDetails(payload);
      setUser(nextUser);
      setToken(getToken());
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setToken("");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    ready,
    isLoading,
    isAuthenticated: Boolean(user),
    preferences: authUserToPreferences(user),
    watchHistory: user?.watchHistory ?? [],
    login,
    register,
    updateProfile,
    refreshUser,
    logout
  }), [user, token, ready, isLoading, login, register, updateProfile, refreshUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
