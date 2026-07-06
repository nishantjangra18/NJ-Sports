"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { SyntheticEvent } from "react";
import {
  Camera,
  CheckCircle2,
  Edit3,
  Loader2,
  LogOut,
  Search,
  Settings,
  UploadCloud,
  UserCircle,
  X
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  clubTeamOptions,
  getDefaultClubLogo,
  internationalTeamOptions,
  resolveClubLogoFromWikipedia,
  type TeamOption
} from "@/lib/teamPreferences";

function initialsFor(name?: string) {
  return name ? name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "NJ";
}

function findTeam(options: TeamOption[], name?: string) {
  return options.find((team) => team.name === name);
}

function fallbackLogo(event: SyntheticEvent<HTMLImageElement>, teamName?: string) {
  const image = event.currentTarget;
  if (image.dataset.logoFallback === "default") return;
  image.dataset.logoFallback = "default";

  void resolveClubLogoFromWikipedia(teamName).then((logo) => {
    image.src = logo || getDefaultClubLogo();
  }).catch(() => {
    image.src = getDefaultClubLogo();
  });
}

function TeamPreferenceCard({
  type,
  team,
  value,
  options,
  editing,
  onChange,
  isOpen,
  onOpenToggle,
  onClose
}: {
  type: string;
  team?: TeamOption;
  value: string;
  options: TeamOption[];
  editing: boolean;
  onChange: (value: string) => void;
  isOpen: boolean;
  onOpenToggle: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const justFocused = useRef(false);

  useEffect(() => {
    if (!editing) {
      setQuery("");
    }
  }, [editing]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.name.toLowerCase().includes(needle)).slice(0, 8) : options.slice(0, 8);
  }, [options, query]);

  function selectTeam(teamName: string) {
    onChange(teamName);
    setQuery("");
    onClose();
  }

  return (
    <div className="group relative rounded-[18px] border border-cyan-200/10 bg-white/[0.055] p-4 shadow-[0_16px_42px_rgba(0,0,0,0.28)] transition duration-300 hover:scale-[1.02] hover:border-cyan-300/35 hover:shadow-[0_18px_55px_rgba(34,211,238,0.14)]">
      <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.14),transparent_30%)] opacity-70" />
      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100/58">{type}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-12 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/26 shadow-inner">
            {team ? (
              <img src={team.logo} alt="" onError={(event) => fallbackLogo(event, team.name)} className="max-h-8 max-w-10 object-contain" />
            ) : (
              <UserCircle className="h-6 w-6 text-white/42" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">{team?.name || "Not selected"}</p>
            <p className="mt-1 text-xs font-medium text-white/42">{editing ? "Search and update preference" : "Saved preference"}</p>
          </div>
        </div>

        {editing ? (
          <div className="relative mt-4">
            <div className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#070a12]/80 px-3 transition focus-within:border-cyan-300/40">
              <Search className="h-4 w-4 shrink-0 text-cyan-100/58" />
              <input
                value={query}
                onFocus={() => {
                  justFocused.current = true;
                  if (!isOpen) onOpenToggle();
                }}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!isOpen) onOpenToggle();
                }}
                onClick={() => {
                  if (justFocused.current) {
                    justFocused.current = false;
                    return;
                  }
                  if (isOpen) {
                    onClose();
                  } else {
                    onOpenToggle();
                  }
                }}
                onBlur={() => window.setTimeout(onClose, 120)}
                placeholder={value || "Search team"}
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/34"
              />
            </div>

            {isOpen ? (
              <div className="absolute left-0 right-0 top-12 z-30 max-h-64 overflow-auto rounded-2xl border border-white/12 bg-[#0b0f1a] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
                {filteredOptions.length ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectTeam(option.name)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.08]"
                    >
                      <img src={option.logo} alt="" onError={(event) => fallbackLogo(event, option.name)} className="h-6 w-8 rounded-md object-contain ring-1 ring-white/10" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/82">{option.name}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm font-medium text-white/44">No teams found</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileExperience() {
  const auth = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [name, setName] = useState(auth.user?.name ?? "");
  const [internationalTeam, setInternationalTeam] = useState(auth.user?.preferences?.internationalTeam ?? auth.user?.favoriteInternationalTeams?.[0] ?? "");
  const [clubTeam, setClubTeam] = useState(auth.user?.preferences?.clubTeam ?? auth.user?.favoriteClubTeams?.[0] ?? "");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"international" | "club" | null>(null);

  const savedInternationalTeam = auth.user?.preferences?.internationalTeam ?? auth.user?.favoriteInternationalTeams?.[0] ?? "";
  const savedClubTeam = auth.user?.preferences?.clubTeam ?? auth.user?.favoriteClubTeams?.[0] ?? "";
  const profileImage = auth.user?.profileImage || auth.user?.profilePic || "";

  useEffect(() => {
    if (auth.ready && !auth.user && !isLoggingOut) router.replace("/login");
  }, [auth.ready, auth.user, isLoggingOut, router]);

  useEffect(() => {
    setName(auth.user?.name ?? "");
    setInternationalTeam(auth.user?.preferences?.internationalTeam ?? auth.user?.favoriteInternationalTeams?.[0] ?? "");
    setClubTeam(auth.user?.preferences?.clubTeam ?? auth.user?.favoriteClubTeams?.[0] ?? "");
  }, [auth.user]);

  useEffect(() => {
    if (!profilePic) {
      setPreviewUrl("");
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(profilePic);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [profilePic]);

  const savedInternational = useMemo(() => findTeam(internationalTeamOptions, savedInternationalTeam), [savedInternationalTeam]);
  const savedClub = useMemo(() => findTeam(clubTeamOptions, savedClubTeam), [savedClubTeam]);
  const editableInternational = useMemo(() => findTeam(internationalTeamOptions, internationalTeam), [internationalTeam]);
  const editableClub = useMemo(() => findTeam(clubTeamOptions, clubTeam), [clubTeam]);
  const avatarUrl = previewUrl || profileImage;
  const initials = initialsFor(auth.user?.name || name);
  const hasChanges = Boolean(profilePic) || name.trim() !== (auth.user?.name ?? "") || internationalTeam !== savedInternationalTeam || clubTeam !== savedClubTeam;
  const canSave = editMode && hasChanges && Boolean(name.trim()) && !auth.isLoading;

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setProfileStatus("");
    setProfileError("");

    try {
      await auth.updateProfile({ name: name.trim(), profilePic, internationalTeam, clubTeam });
      setProfilePic(null);
      setEditMode(false);
      setUploadOpen(false);
      setProfileStatus("Saved successfully");
      window.setTimeout(() => setProfileStatus(""), 2400);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save profile");
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProfilePic(file);
    setProfileStatus("");
    setProfileError("");
    if (file) setEditMode(true);
  }


  function handleLogout() {
    setIsLoggingOut(true);
    auth.logout();
    router.replace("/");
  }
  function cancelEdit() {
    setName(auth.user?.name ?? "");
    setInternationalTeam(savedInternationalTeam);
    setClubTeam(savedClubTeam);
    setProfilePic(null);
    setProfileError("");
    setUploadOpen(false);
    setEditMode(false);
  }

  return (
    <Shell>
      <main className="min-h-screen bg-[#0b0f1a] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl pt-4 max-md:pt-2">
          {auth.user ? (
            <form onSubmit={handleProfileSave} className="relative overflow-visible rounded-[24px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-2xl sm:p-7">
              <div className="pointer-events-none absolute -left-24 -top-28 h-56 w-56 rounded-full bg-cyan-400/18 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 top-4 h-48 w-48 rounded-full bg-purple-500/14 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-blue-500/10 blur-3xl" />

              {auth.isLoading ? (
                <div className="pointer-events-none absolute inset-x-5 top-5 z-30 overflow-hidden rounded-full border border-cyan-200/10 bg-white/[0.08] p-1">
                  <div className="h-1.5 w-1/3 animate-pulse rounded-full bg-cyan-300/70 shadow-[0_0_22px_rgba(34,211,238,0.65)]" />
                </div>
              ) : null}

              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadOpen(true);
                      setEditMode(true);
                    }}
                    className="group relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-3xl font-black text-black shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_18px_55px_rgba(34,211,238,0.18)] transition duration-300 hover:scale-[1.02]"
                    aria-label="Upload profile picture"
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials ? <span>{initials}</span> : <UserCircle className="h-10 w-10" />}
                    <span className="absolute inset-x-0 bottom-0 grid h-10 place-items-center bg-black/66 text-white opacity-0 transition group-hover:opacity-100">
                      <Camera className="h-4 w-4" />
                    </span>
                  </button>

                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-100/58">Profile</p>
                    {editMode ? (
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                        className="mt-2 h-13 w-full min-w-0 rounded-2xl border border-white/10 bg-black/24 px-4 text-3xl font-black tracking-normal text-white outline-none transition placeholder:text-white/34 focus:border-cyan-300/45 sm:min-w-[360px] sm:text-4xl"
                      />
                    ) : (
                      <h1 className="mt-1 truncate text-4xl font-black tracking-normal text-white max-md:text-3xl">{auth.user.name || "NJ Sports User"}</h1>
                    )}
                    <p className="mt-2 truncate text-sm font-medium text-white/56">{auth.user.email}</p>
                    {profileStatus ? (
                      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                        <CheckCircle2 className="h-4 w-4" /> {profileStatus}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 lg:self-start">
                  <button
                    type="button"
                    onClick={() => setEditMode((current) => !current)}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-cyan-200/12 bg-cyan-200/[0.08] px-5 text-sm font-bold text-white transition duration-300 hover:scale-[1.02] hover:border-cyan-300/40 hover:bg-cyan-200/[0.12] hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]"
                  >
                    <Edit3 className="h-4 w-4" /> {editMode ? "Editing" : "Edit Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/settings")}
                    className="grid h-12 w-12 place-items-center rounded-full border border-purple-200/12 bg-purple-200/[0.08] text-white/78 transition duration-300 hover:scale-[1.02] hover:border-purple-300/40 hover:text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.18)]"
                    aria-label="Profile settings"
                    title="Profile settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/68 transition duration-300 hover:scale-[1.02] hover:bg-white/[0.1] hover:text-white"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative z-20 mt-8 grid gap-4 md:grid-cols-2">
                <div className={cn("relative", activeDropdown === "international" ? "z-30" : "z-10")}>
                  <TeamPreferenceCard
                    type="International Team"
                    team={editMode ? editableInternational : savedInternational}
                    value={internationalTeam}
                    options={internationalTeamOptions}
                    editing={editMode}
                    onChange={setInternationalTeam}
                    isOpen={activeDropdown === "international"}
                    onOpenToggle={() => setActiveDropdown(current => current === "international" ? null : "international")}
                    onClose={() => setActiveDropdown(current => current === "international" ? null : current)}
                  />
                </div>
                <div className={cn("relative", activeDropdown === "club" ? "z-30" : "z-10")}>
                  <TeamPreferenceCard
                    type="Club Team"
                    team={editMode ? editableClub : savedClub}
                    value={clubTeam}
                    options={clubTeamOptions}
                    editing={editMode}
                    onChange={setClubTeam}
                    isOpen={activeDropdown === "club"}
                    onOpenToggle={() => setActiveDropdown(current => current === "club" ? null : "club")}
                    onClose={() => setActiveDropdown(current => current === "club" ? null : current)}
                  />
                </div>
              </div>

              {editMode ? (
                <div className="relative z-10 mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    {profileError ? <span className="font-semibold text-red-200">{profileError}</span> : <span className="text-white/44">Profile photo and preferences save to your account.</span>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelEdit} disabled={auth.isLoading} className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-bold text-white/74 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60">
                      Cancel
                    </button>
                    <button type="submit" disabled={!canSave} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#0b0f1a] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60">
                      {auth.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {auth.isLoading ? "Saving..." : hasChanges ? "Save Profile" : "Saved"}
                    </button>
                  </div>
                </div>
              ) : null}

              {uploadOpen ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 px-5 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-[24px] border border-white/12 bg-[#0b0f1a] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.72)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100/58">Profile photo</p>
                        <h2 className="mt-1 text-2xl font-black text-white">Upload image</h2>
                      </div>
                      <button type="button" onClick={() => setUploadOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:text-white" aria-label="Close upload modal">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-5 grid place-items-center rounded-3xl border border-white/10 bg-white/[0.055] p-5">
                      <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full bg-white text-4xl font-black text-black">
                        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span>{initials}</span>}
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageChange} className="sr-only" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-[#0b0f1a] transition hover:scale-[1.01]"
                    >
                      <UploadCloud className="h-4 w-4" /> Choose image
                    </button>
                    <p className="mt-3 text-center text-xs font-medium text-white/42">Save profile after choosing an image.</p>
                  </div>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      </main>
    </Shell>
  );
}











