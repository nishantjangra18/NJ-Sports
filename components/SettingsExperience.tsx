"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Palette, Sparkles, Trophy } from "lucide-react";
import { Shell } from "@/components/Shell";
import { cn } from "@/lib/utils";

type AppTheme = "default" | "fifa";

const storageKey = "app_theme";

const themes: Array<{
  id: AppTheme;
  name: string;
  description: string;
  icon: typeof Palette;
  preview: string[];
}> = [
  {
    id: "default",
    name: "Default Theme",
    description: "The current NJ Sports dark studio look with the original colors.",
    icon: Palette,
    preview: ["#070707", "#171717", "#ffffff", "#ef4444"]
  },
  {
    id: "fifa",
    name: "FIFA World Cup Theme",
    description: "Rainbow stadium energy with neon accents, glass cards, and glowing highlights.",
    icon: Trophy,
    preview: ["#ff004c", "#ffb800", "#00d4ff", "#7cff00"]
  }
];

function readTheme(): AppTheme {
  if (typeof window === "undefined") return "default";
  const savedTheme = window.localStorage.getItem(storageKey);
  return savedTheme === "fifa" ? "fifa" : "default";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new CustomEvent("app-theme-change", { detail: theme }));
}

function ThemeCard({ theme, active, onSelect }: { theme: (typeof themes)[number]; active: boolean; onSelect: () => void }) {
  const Icon = theme.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-[22px] border p-5 text-left shadow-[0_22px_70px_rgba(0,0,0,0.36)] backdrop-blur-2xl transition duration-300 hover:scale-[1.01]",
        active ? "border-cyan-200/50 bg-white/[0.095] shadow-[0_0_44px_rgba(34,211,238,0.18)]" : "border-white/10 bg-white/[0.055] hover:border-white/22 hover:bg-white/[0.075]"
      )}
      aria-pressed={active}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 fifa-theme-card-glow" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/24 text-white shadow-inner">
          <Icon className="h-5 w-5" />
        </span>
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/12 px-3 py-1 text-xs font-bold text-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active
          </span>
        ) : null}
      </div>

      <div className="relative z-10 mt-5">
        <div className="flex gap-2">
          {theme.preview.map((color) => (
            <span key={color} className="h-8 flex-1 rounded-full border border-white/12" style={{ background: color }} />
          ))}
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-normal text-white">{theme.name}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-white/58">{theme.description}</p>
      </div>
    </button>
  );
}

export function SettingsExperience() {
  const [theme, setTheme] = useState<AppTheme>("default");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const savedTheme = readTheme();
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  function selectTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setStatus(nextTheme === "fifa" ? "FIFA World Cup theme applied" : "Default theme applied");
    window.setTimeout(() => setStatus(""), 2200);
  }

  return (
    <Shell>
      <main className="settings-page min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl pt-4 max-md:pt-2">
          <section className="settings-hero-card relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.46)] backdrop-blur-2xl sm:p-7">
            <div className="pointer-events-none absolute -left-24 -top-28 h-56 w-56 rounded-full bg-cyan-400/18 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 top-4 h-48 w-48 rounded-full bg-purple-500/14 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-cyan-100/58">
                  <Sparkles className="h-4 w-4" /> Settings
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-normal text-white max-md:text-3xl">App Preferences</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">Personalize the NJ Sports experience with persistent visual themes.</p>
              </div>
              {status ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                  <CheckCircle2 className="h-4 w-4" /> {status}
                </span>
              ) : null}
            </div>
          </section>

          <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_64px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/42">Appearance</p>
              <h2 className="text-2xl font-black tracking-normal text-white">Theme Selector</h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {themes.map((option) => (
                <ThemeCard key={option.id} theme={option} active={theme === option.id} onSelect={() => selectTheme(option.id)} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </Shell>
  );
}


