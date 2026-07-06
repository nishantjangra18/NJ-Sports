"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Heart, Home, Search, Settings, Shield, Trophy, UserCircle, X } from "lucide-react";
import { FootballIcon } from "@/components/SportsIcons";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";
import { useSearchResults, useWorldCup2026Fixtures } from "@/hooks/useStreamedData";
import { useAuth } from "@/hooks/useAuth";
import type { WorldCupMatch } from "@/services/api/football";

type NavIcon = LucideIcon | ((props: SVGProps<SVGSVGElement>) => ReactNode);

type LinkNavItem = {
  label: string;
  icon: NavIcon;
  href: string;
};

type SearchNavItem = {
  label: string;
  icon: NavIcon;
  action: "search";
};

type NavItem = LinkNavItem | SearchNavItem;

const topNavItems: NavItem[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Search", icon: Search, action: "search" },
  { label: "Live", icon: FootballIcon, href: "/live" },
  { label: "Highlights", icon: Clapperboard, href: "/highlights" },
  { label: "World Cup", icon: Trophy, href: "/world-cup-2026" },
  { label: "Favorites", icon: Heart, href: "/favorites" }
];

const bottomNavItems: LinkNavItem[] = [
  { label: "Profile", icon: UserCircle, href: "/profile" },
  { label: "Settings", icon: Settings, href: "/settings" }
];

const mobileNavItems: LinkNavItem[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Live", icon: FootballIcon, href: "/live" },
  { label: "Highlights", icon: Clapperboard, href: "/highlights" },
  { label: "World Cup", icon: Trophy, href: "/world-cup-2026" }
];

function isLinkItem(item: NavItem): item is LinkNavItem {
  return "href" in item;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { query, setQuery, results, isLoading } = useSearchResults();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showResults = query.trim().length >= 2;

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 bg-black/76 backdrop-blur-2xl"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-20 w-[min(760px,calc(100vw-32px))]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-4 rounded-[28px] border border-white/12 bg-white/[0.08] px-5 py-4 shadow-premium backdrop-blur-2xl">
              <Search className="h-6 w-6 shrink-0 text-white/80" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search live football matches, teams, competitions"
                className="min-w-0 flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder:text-white/42"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showResults ? (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-black/72 p-2 shadow-premium backdrop-blur-2xl">
                {isLoading ? (
                  <div className="space-y-2 p-2">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-14 animate-pulse rounded-2xl bg-white/10" />
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="max-h-[55vh] overflow-y-auto p-1">
                    {results.map((result) => {
                      const content = (
                        <div className="rounded-2xl px-4 py-3 transition hover:bg-white/10">
                          <p className="text-base font-semibold text-white">{result.label}</p>
                          <p className="mt-0.5 text-sm text-studio-muted">{result.type}</p>
                        </div>
                      );

                      return result.href ? (
                        <Link key={result.id} href={result.href} onClick={() => {
                          setQuery("");
                          onClose();
                        }}>
                          {content}
                        </Link>
                      ) : (
                        <div key={result.id}>{content}</div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-studio-muted">No Football Results Found</div>
                )}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ProfileAvatar({ name, src, compact = false }: { name?: string; src?: string; compact?: boolean }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-white text-black", compact ? "h-10 w-10 text-sm font-bold" : "h-8 w-8 text-[11px] font-bold")}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : getInitials(name) || <UserCircle className="h-5 w-5 text-black/70" />}
    </span>
  );
}

function SidebarItem({ item, active, onSearch, onProfile, profileName, profilePic }: { item: NavItem; active?: boolean; onSearch: () => void; onProfile: () => void; profileName?: string; profilePic?: string }) {
  const router = useRouter();
  const Icon = item.icon;
  const className = cn(
    "group/item relative flex h-12 w-full items-center text-white transition duration-200 ease-out hover:-translate-y-0.5",
    active ? "opacity-100" : "opacity-70 hover:opacity-100"
  );
  const content = (
    <>
      {active ? <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-studio-accent shadow-[0_0_14px_rgba(255,40,40,0.75)]" /> : null}
      <span className="grid h-12 w-[72px] shrink-0 place-items-center">
        {isLinkItem(item) && item.href === "/profile" ? <ProfileAvatar name={profileName} src={profilePic} /> : <Icon className={cn("h-[21px] w-[21px] stroke-[2] text-white transition duration-200 group-hover/item:scale-[1.05] group-hover/item:drop-shadow-[0_0_8px_rgba(255,40,40,0.35)]", active && "drop-shadow-[0_0_10px_rgba(255,40,40,0.48)]")} />}
      </span>
      <span className={cn("pointer-events-none translate-x-[-8px] whitespace-nowrap text-sm font-semibold tracking-normal text-white opacity-0 transition duration-200 ease-out group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-hover/item:[text-shadow:0_0_6px_rgba(255,40,40,0.35),0_0_12px_rgba(255,40,40,0.18)]", active && "[text-shadow:0_0_7px_rgba(255,40,40,0.48),0_0_14px_rgba(255,40,40,0.26)]")}>
        {item.label}
      </span>
    </>
  );

  if (isLinkItem(item)) {
    if (item.href === "/profile") {
      return (
        <button type="button" aria-label={item.label} title={item.label} aria-current={active ? "page" : undefined} onClick={onProfile} className={className}>
          {content}
        </button>
      );
    }

    return (
      <Link
        href={item.href}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? "page" : undefined}
        onMouseEnter={() => router.prefetch(item.href)}
        onFocus={() => router.prefetch(item.href)}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label="Open search" title="Search" onClick={onSearch} className={className}>
      {content}
    </button>
  );
}

export function Shell({ children, immersive = false }: { children: ReactNode; immersive?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const auth = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWorldCupPage = pathname === "/world-cup-2026";
  const fixtures = useWorldCup2026Fixtures();
  const allMatches = fixtures.data?.all ?? [];

  const isAdmin = mounted && auth.user?.role === "admin";
  const sidebarTopNavItems = useMemo(() => {
    const items = [...topNavItems];
    if (isAdmin) {
      items.push({ label: "Admin", icon: Shield, href: "/admin" });
    }
    return items;
  }, [isAdmin]);

  function handleProfileRequest() {
    router.push(auth.user ? "/profile" : "/login");
  }

  const surfaceClass = pathname === "/" ? "fifa-home-surface" : pathname.startsWith("/world-cup-2026") ? "fifa-worldcup-surface" : "";


  return (
    <div className={cn("min-h-screen bg-studio-bg text-white", surfaceClass)}>
      {!immersive ? (
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[rgba(7,7,7,0.92)] px-4 shadow-[0_14px_40px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:hidden">
          <BrandLogo priority imageClassName="h-9 w-9" />
          <button
            type="button"
            onClick={handleProfileRequest}
            aria-label="Profile"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white transition active:scale-95"
          >
            <ProfileAvatar name={mounted ? auth.user?.name : undefined} src={mounted ? auth.user?.profilePic : undefined} compact />
          </button>
        </header>
      ) : null}

      {!immersive ? <aside className="group/sidebar fixed inset-y-0 left-0 z-30 hidden w-[72px] overflow-hidden rounded-r-[28px] border-r border-white/10 bg-[rgba(10,10,10,0.92)] shadow-[18px_0_45px_rgba(0,0,0,0.36)] backdrop-blur-[20px] transition-[width] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[240px] lg:block">
        <div className="flex h-full w-[240px] flex-col py-5">
          <div className="flex h-14 items-center px-3">
            <BrandLogo showName={false} priority imageClassName="h-11 w-11" />
            <span className="ml-3 translate-x-[-8px] whitespace-nowrap text-base font-semibold tracking-normal text-white opacity-0 transition duration-[250ms] group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100">NJ Sports</span>
          </div>

          <nav className="mt-8 flex flex-1 flex-col justify-between px-0" aria-label="Primary navigation">
            <div className="space-y-2 px-0">
              {sidebarTopNavItems.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  active={isLinkItem(item) ? isActivePath(pathname, item.href) : false}
                  onSearch={() => setSearchOpen(true)}
                  onProfile={handleProfileRequest}
                  profileName={mounted ? auth.user?.name : undefined}
                  profilePic={mounted ? auth.user?.profilePic : undefined}
                />
              ))}
            </div>

            <div className="space-y-2 px-0 pb-2">
              {bottomNavItems.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  active={isActivePath(pathname, item.href)}
                  onSearch={() => setSearchOpen(true)}
                  onProfile={handleProfileRequest}
                  profileName={mounted ? auth.user?.name : undefined}
                  profilePic={mounted ? auth.user?.profilePic : undefined}
                />
              ))}
            </div>
          </nav>
        </div>
      </aside> : null}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <motion.main
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className={cn("min-h-screen", !immersive && "max-md:pb-36 max-md:pt-16 lg:pl-[72px]")}
      >
        {children}
      </motion.main>

      {!immersive ? (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(7,7,7,0.94)] px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_45px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-4 items-center">
            {mobileNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="group flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-semibold tracking-normal text-white/58 transition active:scale-95"
                >
                  <span className={cn(
                    "grid h-8 w-12 place-items-center rounded-full transition",
                    active ? "bg-studio-accent/16 text-white shadow-[0_0_20px_rgba(255,40,40,0.32)]" : "text-white/62 group-active:bg-white/10"
                  )}>
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </span>
                  <span className={cn("truncate", active ? "text-white" : "text-white/58")}>{item.label}</span>
                  <span className={cn("h-0.5 w-5 rounded-full transition", active ? "bg-studio-accent shadow-[0_0_12px_rgba(255,40,40,0.7)]" : "bg-transparent")} />
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {!immersive && isWorldCupPage && <Ticker matches={allMatches} />}
    </div>
  );
}

function timeValue(match: WorldCupMatch) {
  const parsed = Date.parse(match.kickoffTimestamp ?? "");
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function Ticker({ matches }: { matches: WorldCupMatch[] }) {
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;
      
      const aTime = timeValue(a);
      const bTime = timeValue(b);
      if (a.isFinished) {
        return bTime - aTime;
      }
      return aTime - bTime;
    });
  }, [matches]);

  const items = useMemo(() => {
    return sortedMatches.map(match => {
      const isLive = match.isLive;
      const isFinished = match.isFinished;
      const homeScore = match.score.home;
      const awayScore = match.score.away;
      const hasScore = homeScore !== null && awayScore !== null;
      
      let scoreText = `${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`;
      if (isLive || isFinished || hasScore) {
        scoreText = `${match.homeTeam.shortName} ${homeScore ?? 0} - ${awayScore ?? 0} ${match.awayTeam.shortName}`;
        if (isLive) {
          scoreText = `🔴 ${scoreText} (LIVE)`;
        } else if (isFinished) {
          scoreText = `FT | ${scoreText}`;
        }
      } else {
        const kickoff = timeValue(match);
        if (kickoff !== Number.MAX_SAFE_INTEGER) {
          const kickoffDate = new Date(kickoff);
          const timeStr = kickoffDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          const dateStr = kickoffDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          scoreText = `${match.homeTeam.shortName} vs ${match.awayTeam.shortName} (${dateStr} ${timeStr})`;
        } else {
          scoreText = `${match.homeTeam.shortName} vs ${match.awayTeam.shortName} (TBD)`;
        }
      }
      return {
        fixtureId: match.fixtureId,
        text: scoreText
      };
    });
  }, [sortedMatches]);

  if (items.length === 0) return null;

  const duplicatedItems = [...items, ...items, ...items, ...items];

  return (
    <div className="world-cup-ticker border-t border-white/10 bg-black/85 py-3 backdrop-blur-2xl select-none overflow-hidden">
      <style>{`
        .world-cup-ticker {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(84px + env(safe-area-inset-bottom));
          z-index: 20;
        }
        @media (min-width: 768px) {
          .world-cup-ticker {
            bottom: 0;
          }
        }
        .ticker-wrap {
          width: 100%;
          overflow: hidden;
        }
        .ticker-content {
          display: flex;
          width: max-content;
          animation: ticker-scroll 45s linear infinite;
        }
        .ticker-content:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
      
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 sm:px-8 lg:px-10">
        <span className="shrink-0 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-red-400 border border-red-500/10">
          World Cup Ticker
        </span>
        <div className="ticker-wrap flex-1">
          <div className="ticker-content gap-8 text-xs font-semibold text-white/70">
            {duplicatedItems.map((item, idx) => (
              <Link
                key={`t1-${item.fixtureId}-${idx}`}
                href={`/matches/${encodeURIComponent(item.fixtureId)}`}
                className="shrink-0 hover:text-studio-accent transition whitespace-nowrap"
              >
                {item.text}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}








