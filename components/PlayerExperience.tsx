"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BarChart3, Check, Cloud, Heart, Maximize, Minimize } from "lucide-react";
import type HlsInstance from "hls.js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { MatchCenterPanel } from "@/components/MatchCenterPanel";
import { Shell } from "@/components/Shell";
import { cn } from "@/lib/utils";
import { getResumeTimeFromSearch, upsertContinueWatchingItem } from "@/lib/continueWatching";
import { useStreams, useWatchRouteTarget } from "@/hooks/useStreamedData";
import { useAuth } from "@/hooks/useAuth";
import type { StreamedStream } from "@/services/api/types";

const iframeLoadTimeoutMs = 12000;
type PlayerRenderMode = "html5-video" | "hls-js" | "video-js" | "iframe" | "third-party";
type HlsPlayer = HlsInstance;
type ScreenOrientationLock = "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";

function streamKey(stream: StreamedStream, index: number) {
  return `${stream.id}-${index}-${stream.embedUrl}`;
}

const PREDEFINED_SERVERS = [
  "Server #1 (English - TSN)",
  "Server #2 (English - TSN)",
  "Server #3 (English - FOX)",
  "Server #4 (English - FOX)",
  "Server #5 (English - BBC/ITV)",
  "Server #6 (English - BBC/ITV)",
  "Server #7 (French - BeIN Sports 1)",
  "Server #8 (French - BeIN Sports 1)",
  "Server #9 (Spanish - DAZN Spain)",
  "Server #10 (Spanish - DAZN Spain)",
  "Server #11 (Spanish - Telemundo)",
  "Server #12 (Spanish - Telemundo)"
];

function getPredefinedServerLabel(index: number): string {
  if (index >= 0 && index < PREDEFINED_SERVERS.length) {
    return PREDEFINED_SERVERS[index];
  }
  return `Server #${index + 1}`;
}

function streamLabel(stream: StreamedStream, index: number, recommendedIndex: number | null) {
  return getPredefinedServerLabel(index);
}

function streamSourceLabel(stream: StreamedStream, index: number) {
  return getPredefinedServerLabel(index);
}

function streamLanguageLabel(stream: StreamedStream) {
  return "Default";
}

function nextCandidateIndex(streams: StreamedStream[], failedKeys: Set<string>, currentIndex: number) {
  for (let offset = 1; offset <= streams.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % streams.length;
    const candidate = streams[candidateIndex];
    if (candidate && !failedKeys.has(streamKey(candidate, candidateIndex))) return candidateIndex;
  }
  return null;
}

function stringifyRawStream(stream: StreamedStream) {
  try {
    return JSON.stringify(stream.raw ?? stream).toLowerCase();
  } catch {
    return String(stream.embedUrl).toLowerCase();
  }
}

function isDirectMediaUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    return /\.(m3u8|mp4)(?:$|[?#])/i.test(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return /\.(m3u8|mp4)(?:$|[?#])/i.test(url);
  }
}

function isHlsUrl(url: string) {
  return /\.m3u8(?:$|[?#])/i.test(url);
}

function getPlayerDiagnostics(stream: StreamedStream): { renderMode: PlayerRenderMode; reason: string; crossOriginEmbed: boolean } {
  const rawText = stringifyRawStream(stream);
  const directMedia = isDirectMediaUrl(stream.embedUrl);
  const containsIframe = rawText.includes("<iframe") || rawText.includes("iframe");
  const containsEmbed = rawText.includes("embedurl") || rawText.includes("embed url") || rawText.includes("/embed") || rawText.includes("embed/");
  const containsVideoJs = rawText.includes("video.js") || rawText.includes("videojs") || rawText.includes("video-js");

  if (directMedia) {
    return {
      renderMode: isHlsUrl(stream.embedUrl) ? "hls-js" : "html5-video",
      reason: isHlsUrl(stream.embedUrl) ? "Direct .m3u8 media URL" : "Direct .mp4 media URL",
      crossOriginEmbed: false
    };
  }

  if (containsVideoJs) {
    return { renderMode: "video-js", reason: "Response references Video.js", crossOriginEmbed: false };
  }

  if (containsIframe || containsEmbed) {
    return { renderMode: "iframe", reason: "Response contains an iframe or embed URL", crossOriginEmbed: true };
  }

  return { renderMode: "third-party", reason: "Response URL is not a direct .mp4/.m3u8 media asset", crossOriginEmbed: true };
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
}

function isTouchDevice() {
  return typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
}

function isMobileStreamDevice() {
  return isMobileViewport() || isTouchDevice();
}

function isPortraitViewport() {
  return typeof window !== "undefined" && window.innerHeight > window.innerWidth;
}

function getScreenOrientation() {
  if (typeof screen === "undefined" || !("orientation" in screen)) return null;
  return screen.orientation as ScreenOrientation & {
    lock?: (orientation: ScreenOrientationLock) => Promise<void>;
    unlock?: () => void;
  };
}

function PlayerSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <div className="w-full max-w-sm px-8 text-center">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full border border-white/15 bg-white/10" />
        <div className="mx-auto mt-6 h-3 w-44 animate-pulse rounded-full bg-white/10" />
        <div className="mx-auto mt-3 h-2 w-28 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function NativeStreamPlayer({ stream, title, startTime = 0, onReady, onError, onProgress }: { stream: StreamedStream; title: string; startTime?: number; onReady: () => void; onError: (message?: string) => void; onProgress?: (watchedTime: number, duration: number) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readyRef = useRef(false);
  const hlsUrl = isHlsUrl(stream.embedUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    readyRef.current = false;
    video.playsInline = true;
    video.preload = "metadata";

    let destroyed = false;
    let hls: HlsPlayer | null = null;

    const markReady = () => {
      if (readyRef.current || destroyed) return;
      readyRef.current = true;
      onReady();
    };

    const loadNative = () => {
      video.src = stream.embedUrl;
      video.load();
    };

    if (hlsUrl && !video.canPlayType("application/vnd.apple.mpegurl")) {
      void import("hls.js")
        .then((module) => {
          if (destroyed) return;
          const Hls = module.default;
          if (!Hls.isSupported()) {
            console.warn("[streamed.pk] HLS.js is not supported in this browser.", { url: stream.embedUrl });
            loadNative();
            return;
          }
          console.info("[streamed.pk] player renderer", { player: "HLS.js", url: stream.embedUrl });
          hls = new Hls({ enableWorker: true });
          hls.on(Hls.Events.MANIFEST_PARSED, markReady);
          hls.on(Hls.Events.ERROR, (_event: unknown, data: unknown) => {
            console.error("[streamed.pk] HLS.js error", data);
          });
          hls.loadSource(stream.embedUrl);
          hls.attachMedia(video);
        })
        .catch((error) => {
          console.error("[streamed.pk] failed to load HLS.js", error);
          onError("Unable to load HLS player.");
        });
    } else {
      console.info("[streamed.pk] player renderer", { player: hlsUrl ? "HTML5 video native HLS" : "HTML5 video", url: stream.embedUrl });
      loadNative();
    }

    return () => {
      destroyed = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [hlsUrl, onError, onReady, stream.embedUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || startTime <= 0) return;
    const seekToResumeTime = () => {
      if (video.duration > startTime) video.currentTime = startTime;
    };
    video.addEventListener("loadedmetadata", seekToResumeTime, { once: true });
    return () => video.removeEventListener("loadedmetadata", seekToResumeTime);
  }, [startTime, stream.embedUrl]);

  return (
    <video
      key={stream.embedUrl}
      ref={videoRef}
      title={title}
      className="absolute inset-0 h-full w-full bg-black object-contain"
      playsInline
      controls
      onCanPlay={() => {
        if (!hlsUrl) onReady();
      }}
      onLoadedMetadata={() => {
        if (!hlsUrl && videoRef.current?.readyState) onReady();
      }}
      onTimeUpdate={(event) => onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)}
      onPause={(event) => onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)}
      onEnded={() => onProgress?.(Number.POSITIVE_INFINITY, 1)}
      onError={() => onError("Unable to load selected server.")}
    />
  );
}

function PlayerIconButton({ label, onClick, active, children }: { label: string; onClick?: (event: MouseEvent<HTMLButtonElement>) => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/36 text-white shadow-premium backdrop-blur-xl transition hover:bg-white/14",
        active && "bg-white/16 text-studio-accent"
      )}
    >
      {children}
    </button>
  );
}

export function PlayerExperience({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = useWatchRouteTarget(slug);
  const streams = useStreams(target.source, target.id);
  const auth = useAuth();
  const playerContainerRef = useRef<HTMLElement | null>(null);
  const hideControlsTimer = useRef<number | null>(null);
  const iframeLoadTimer = useRef<number | null>(null);
  const iframeWatchedTimeRef = useRef(0);
  const lastProgressSaveRef = useRef(0);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [previousWorkingIndex, setPreviousWorkingIndex] = useState<number | null>(null);
  const [recommendedIndex, setRecommendedIndex] = useState<number | null>(null);
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileCinemaMode, setMobileCinemaMode] = useState(false);
  const [mobileLandscapeSimulated, setMobileLandscapeSimulated] = useState(false);
  const [matchCenterOpen, setMatchCenterOpen] = useState(false);
  const [isExitingStream, setIsExitingStream] = useState(false);
  const mobilePlayerWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileViewport());
    const handleResize = () => {
      setIsMobile(isMobileViewport());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!auth.user || !slug) return;

    const sendHeartbeat = (status: "active" | "inactive" = "active") => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json"
      };
      if (auth.token) {
        headers["Authorization"] = `Bearer ${auth.token}`;
      }

      if (status === "inactive" && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ streamId: slug, streamTitle: target.title || slug, status })], {
          type: "application/json"
        });
        navigator.sendBeacon("/api/live-stream/heartbeat", blob);
        return;
      }

      fetch("/api/live-stream/heartbeat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          streamId: slug,
          streamTitle: target.title || slug,
          status
        }),
        keepalive: true
      }).catch(() => {});
    };

    sendHeartbeat("active");

    const timer = window.setInterval(() => {
      sendHeartbeat("active");
    }, 5000);

    const handleBeforeUnload = () => {
      sendHeartbeat("inactive");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendHeartbeat("inactive");
    };
  }, [auth.user, auth.token, slug, target.title]);

  function toggleMobileFullscreen() {
    setIsFullscreen((prev) => !prev);
  }

  useEffect(() => {
    if (!isMobile) return;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isFullscreen]);

  const [mobileControlsVisible, setMobileControlsVisible] = useState(true);
  const mobileControlsTimer = useRef<number | null>(null);

  function showMobileControlsTemporarily() {
    setMobileControlsVisible(true);
    if (mobileControlsTimer.current) window.clearTimeout(mobileControlsTimer.current);
    mobileControlsTimer.current = window.setTimeout(() => setMobileControlsVisible(false), 3000);
  }

  useEffect(() => {
    if (isMobile && isFullscreen) {
      showMobileControlsTemporarily();
    }
  }, [isMobile, isFullscreen]);

  useEffect(() => {
    return () => {
      if (mobileControlsTimer.current) window.clearTimeout(mobileControlsTimer.current);
    };
  }, []);

  function handleMobilePlayerTap(event: React.MouseEvent<HTMLDivElement>) {
    if (!isMobile) return;
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest("button")) return;
    showMobileControlsTemporarily();
  }
  const streamList = streams.data ?? [];
  const activeStream = isExitingStream ? null : streamList[activeStreamIndex] ?? streamList[0];
  const resolvedActiveIndex = activeStream ? Math.max(0, streamList.indexOf(activeStream)) : 0;
  const activeKey = activeStream ? streamKey(activeStream, resolvedActiveIndex) : "";
  const activeLabel = activeStream ? streamLabel(activeStream, resolvedActiveIndex, recommendedIndex) : "Stream";
  const activeDiagnostics = activeStream ? getPlayerDiagnostics(activeStream) : null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const title = target.title ?? "Live Stream";
  const displayTitle = mounted ? title : "Live Stream";
  const resumeTime = getResumeTimeFromSearch(searchParams.toString());
  const isLiveMatch = target.live === true;
  const isPlayerLoading = !isExitingStream && (target.isResolving || streams.isLoading || (!activeStream && Boolean(target.source && target.id)));

  function saveContinueProgress(watchedTime: number, duration: number) {
    if (!activeStream || !target.source || !target.id) return;
    const now = Date.now();
    if (watchedTime !== Number.POSITIVE_INFINITY && now - lastProgressSaveRef.current < 2500) return;
    lastProgressSaveRef.current = now;
    upsertContinueWatchingItem({
      videoId: `stream:${target.source}:${target.id}`,
      title,
      thumbnail: target.image ?? "/brand/football-placeholder.svg",
      url: `/watch/${encodeURIComponent(slug)}`,
      duration: Number.isFinite(duration) && duration > 0 ? duration : 7200,
      watchedTime: watchedTime === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, watchedTime),
      lastWatchedAt: now
    });
  }

  useEffect(() => {
    if (isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  useEffect(() => {
    if (!mobileCinemaMode) return;

    const syncMobileOrientation = () => {
      setMobileLandscapeSimulated(isMobileViewport() && isPortraitViewport());
    };

    syncMobileOrientation();
    window.addEventListener("resize", syncMobileOrientation);
    window.addEventListener("orientationchange", syncMobileOrientation);
    return () => {
      window.removeEventListener("resize", syncMobileOrientation);
      window.removeEventListener("orientationchange", syncMobileOrientation);
    };
  }, [mobileCinemaMode]);

  useEffect(() => {
    return () => {
      try {
        getScreenOrientation()?.unlock?.();
      } catch {
        // Some mobile browsers throw when orientation was not locked by this page.
      }
    };
  }, []);

  useEffect(() => {
    setActiveStreamIndex(0);
    setPreviousWorkingIndex(null);
    setRecommendedIndex(null);
    setFailedKeys(new Set());
    setMatchCenterOpen(false);
    setIsExitingStream(false);
  }, [target.source, target.id]);

  useEffect(() => {
    if (activeStreamIndex >= streamList.length) setActiveStreamIndex(0);
  }, [activeStreamIndex, streamList.length]);

  useEffect(() => {
    if (!activeStream || !activeDiagnostics) return;
    console.info("[streamed.pk] selected stream classification", {
      player: activeDiagnostics.renderMode,
      reason: activeDiagnostics.reason,
      url: activeStream.embedUrl,
      raw: activeStream.raw ?? activeStream
    });
  }, [activeDiagnostics, activeKey, activeStream]);

  useEffect(() => {
    iframeWatchedTimeRef.current = resumeTime;
  }, [activeKey, resumeTime]);

  useEffect(() => {
    if (!activeStream || !activeDiagnostics) return;
    if (activeDiagnostics.renderMode === "html5-video" || activeDiagnostics.renderMode === "hls-js") return;
    const timer = window.setInterval(() => {
      iframeWatchedTimeRef.current += 5;
      saveContinueProgress(iframeWatchedTimeRef.current, 7200);
    }, 5000);
    return () => {
      window.clearInterval(timer);
      saveContinueProgress(iframeWatchedTimeRef.current, 7200);
    };
  }, [activeDiagnostics, activeKey, activeStream, resumeTime]);

  useEffect(() => {
    if (!activeStream) return;
    if (!isMobileViewport()) {
      void enterMobileCinemaMode();
    }
    setSwitching(true);
    if (iframeLoadTimer.current) window.clearTimeout(iframeLoadTimer.current);
    iframeLoadTimer.current = window.setTimeout(() => handleStreamFailure("Stream did not respond."), iframeLoadTimeoutMs);
    return () => {
      if (iframeLoadTimer.current) window.clearTimeout(iframeLoadTimer.current);
    };
  }, [activeKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
      if (iframeLoadTimer.current) window.clearTimeout(iframeLoadTimer.current);
    };
  }, []);

  function showControlsTemporarily() {
    setControlsVisible(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    if (!serverMenuOpen) {
      hideControlsTimer.current = window.setTimeout(() => setControlsVisible(false), 3500);
    }
  }

  function switchServer(index: number) {
    if (index === resolvedActiveIndex) {
      setServerMenuOpen(false);
      return;
    }
    if (previousWorkingIndex === null && !failedKeys.has(activeKey)) setPreviousWorkingIndex(resolvedActiveIndex);
    setSwitching(true);
    setActiveStreamIndex(index);
    setServerMenuOpen(false);
    showControlsTemporarily();
  }

  function handleStreamReady() {
    if (iframeLoadTimer.current) window.clearTimeout(iframeLoadTimer.current);
    if (!isMobileViewport()) {
      void enterMobileCinemaMode();
    }
    setSwitching(false);
    setPreviousWorkingIndex(resolvedActiveIndex);
    setFailedKeys((current) => {
      const next = new Set(current);
      next.delete(activeKey);
      return next;
    });
    setRecommendedIndex((current) => current ?? resolvedActiveIndex);
  }

  function handleStreamFailure(message = "Unable to load selected server.") {
    if (iframeLoadTimer.current) window.clearTimeout(iframeLoadTimer.current);
    if (!activeStream) return;
    setFailedKeys((current) => {
      const next = new Set(current);
      next.add(activeKey);
      const rollbackIndex = previousWorkingIndex !== null && previousWorkingIndex !== resolvedActiveIndex ? previousWorkingIndex : null;
      const fallbackIndex = rollbackIndex ?? nextCandidateIndex(streamList, next, resolvedActiveIndex);
      if (fallbackIndex !== null && fallbackIndex !== resolvedActiveIndex) {
        window.setTimeout(() => {
          setActiveStreamIndex(fallbackIndex);
          setSwitching(true);
          setToast(rollbackIndex !== null ? "Restored previous server." : "Switched to Backup Server.");
        }, 0);
      } else {
        window.setTimeout(() => {
          setSwitching(false);
          setToast(message);
        }, 0);
      }
      return next;
    });
  }

  async function enterMobileCinemaMode() {
    if (!isMobileViewport()) return;

    const container = playerContainerRef.current;
    setMobileCinemaMode(true);
    setMatchCenterOpen(false);
    showControlsTemporarily();

    if (container && document.fullscreenElement !== container) {
      try {
        await container.requestFullscreen();
      } catch {
        // Fullscreen often requires a fresh tap gesture; the rotated fallback still gives mobile cinema mode.
      }
    }

    try {
      const orientation = getScreenOrientation();
      if (!orientation?.lock) throw new Error("Orientation lock unavailable");
      await orientation.lock("landscape");
      setMobileLandscapeSimulated(false);
    } catch {
      setMobileLandscapeSimulated(isPortraitViewport());
    }
  }

  async function exitMobileCinemaMode() {
    setMobileCinemaMode(false);
    setMobileLandscapeSimulated(false);
    try {
      getScreenOrientation()?.unlock?.();
    } catch {
      // Ignore browser-specific orientation unlock failures.
    }

    if (document.fullscreenElement === playerContainerRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        // Browser already handled fullscreen exit.
      }
    }
  }

  function resetMobileStreamStateForExit() {
    setIsExitingStream(true);
    setIsFullscreen(false);
    setMobileCinemaMode(false);
    setMobileLandscapeSimulated(false);
    setMatchCenterOpen(false);
    setServerMenuOpen(false);
    setSwitching(false);
    setActiveStreamIndex(0);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    if (iframeLoadTimer.current) window.clearTimeout(iframeLoadTimer.current);
  }


  async function handleBack(event?: MouseEvent<HTMLButtonElement>) {
    if (isMobileStreamDevice()) {
      event?.preventDefault();
      event?.stopPropagation();
      resetMobileStreamStateForExit();
      if (document.fullscreenElement === playerContainerRef.current) {
        try {
          await document.exitFullscreen();
        } catch {
          // Browser already handled fullscreen exit.
        }
      }
      router.back();
      return;
    }

    router.back();
  }

  function handlePlayerTap(event: PointerEvent<HTMLElement>) {
    if (!isMobileViewport()) return;
    const targetElement = event.target instanceof HTMLElement ? event.target : null;
    if (targetElement?.closest("button, a, [role=menu], video")) return;

    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    setControlsVisible((visible) => {
      const nextVisible = !visible;
      if (nextVisible && !serverMenuOpen) {
        hideControlsTimer.current = window.setTimeout(() => setControlsVisible(false), 3500);
      }
      return nextVisible;
    });
  }

  async function toggleFullscreen() {
    const container = playerContainerRef.current;
    if (!container) return;

    if (isMobileViewport()) {
      if (document.fullscreenElement === container || mobileCinemaMode) {
        await exitMobileCinemaMode();
        return;
      }
      await enterMobileCinemaMode();
      return;
    }

    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    await container.requestFullscreen();
  }

  if (!mounted) {
    return (
      <Shell immersive>
        <section
          ref={playerContainerRef}
          className="fixed inset-0 h-screen w-screen overflow-hidden bg-black text-white"
        >
          <div className="absolute inset-0 overflow-hidden bg-black">
            <PlayerSkeleton />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/78 via-black/32 to-transparent px-5 pb-16 pt-5 sm:px-8 max-md:px-4 max-md:pb-20 max-md:pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="pointer-events-auto flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <PlayerIconButton label="Back" onClick={(event) => void handleBack(event)}>
                    <ArrowLeft className="h-5 w-5" />
                  </PlayerIconButton>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/58">Now Watching</p>
                    <h1 className="truncate text-base font-semibold tracking-normal text-white sm:text-xl">Live Stream</h1>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PlayerIconButton label="Favorite" active={false}>
                    <Heart className="h-5 w-5" />
                  </PlayerIconButton>
                  <PlayerIconButton label="Server" active={false}>
                    <Cloud className="h-5 w-5" />
                  </PlayerIconButton>
                  <PlayerIconButton label="Fullscreen" active={false}>
                    <Maximize className="h-5 w-5" />
                  </PlayerIconButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Shell>
    );
  }

  if (isMobile) {
    return (
      <Shell immersive>
        <div className={cn("flex flex-col bg-black text-white", isFullscreen ? "h-screen w-screen overflow-hidden" : "min-h-screen")}>
          {/* Header */}
          {!isFullscreen && (
            <header className="sticky top-0 z-50 flex items-center h-14 border-b border-white/10 bg-neutral-950 px-4">
              <button
                onClick={(e) => void handleBack(e)}
                className="flex items-center gap-1.5 text-sm font-semibold text-neutral-300 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <div className="flex-1 text-center pr-12">
                <h1 className="text-base font-bold truncate px-4">{displayTitle}</h1>
              </div>
            </header>
          )}

          {/* Main content */}
          <main className={cn("flex-1 flex flex-col gap-4 max-w-lg mx-auto w-full", isFullscreen ? "p-0 justify-center h-full" : "p-4")}>
            {/* Controls row: Dropdown and Fullscreen Button */}
            {!isFullscreen && (
              <div className="flex items-end justify-between gap-4">
                {/* Server selector */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <label htmlFor="mobile-server-select" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Select Server
                  </label>
                  <div className="relative">
                    <select
                      id="mobile-server-select"
                      value={resolvedActiveIndex}
                      onChange={(e) => switchServer(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-studio-accent/50 appearance-none transition"
                    >
                      {streamList.map((stream, index) => (
                        <option key={streamKey(stream, index)} value={index}>
                          {getPredefinedServerLabel(index)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stream Player Section */}
            <div
              ref={mobilePlayerWrapperRef}
              onClick={handleMobilePlayerTap}
              className={cn(
                isFullscreen
                  ? "fixed inset-0 w-screen h-screen z-[9999] bg-black flex items-center justify-center overflow-hidden portrait:w-[100dvh] portrait:h-[100dvw] portrait:rotate-90 portrait:left-1/2 portrait:top-1/2 portrait:-translate-x-1/2 portrait:-translate-y-1/2"
                  : "relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
              )}
            >
              {activeStream && activeDiagnostics ? (
                activeDiagnostics.renderMode === "html5-video" || activeDiagnostics.renderMode === "hls-js" ? (
                  <NativeStreamPlayer
                    key={activeKey}
                    stream={activeStream}
                    title={activeLabel}
                    startTime={resumeTime}
                    onReady={handleStreamReady}
                    onError={handleStreamFailure}
                    onProgress={saveContinueProgress}
                  />
                ) : (
                  <iframe
                    key={activeKey}
                    src={activeStream.embedUrl}
                    title={activeLabel}
                    allow="fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    onLoad={handleStreamReady}
                    onError={() => handleStreamFailure()}
                    className="absolute inset-0 h-full w-full border-0"
                  />
                )
              ) : null}

              {/* Overlays for loading / switching / error states */}
              {!isExitingStream && isPlayerLoading ? (
                <PlayerSkeleton />
              ) : !isExitingStream && streams.isError ? (
                <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center z-10">
                  <div>
                    <h2 className="text-base font-semibold text-white">Unable to load stream</h2>
                    <button
                      type="button"
                      onClick={() => void streams.refetch()}
                      className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.02]"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : !isExitingStream && !activeStream ? (
                <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center z-10">
                  <div>
                    <h2 className="text-base font-semibold text-white">No stream servers available</h2>
                    <button
                      type="button"
                      onClick={target.retry}
                      className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.02]"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : null}

              {!isExitingStream && switching ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-white/20 bg-white/10" />
                    <p className="mt-3 text-xs font-semibold text-white/70">Loading stream...</p>
                  </div>
                </div>
              ) : null}

              {/* Controls overlay when in fullscreen on mobile */}
              {isFullscreen && (
                <>
                  {/* Back button (Top Left) */}
                  <div
                    className={cn(
                      "absolute top-4 left-4 z-50 transition-opacity duration-300",
                      mobileControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => void handleBack(e)}
                      className="bg-black/60 hover:bg-black/80 border border-white/10 rounded-full px-4 py-2 text-sm font-semibold text-white transition flex items-center gap-1.5 backdrop-blur-md shadow-md"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                  </div>

                  {/* Minimize button (Top Right) */}
                  <div
                    className={cn(
                      "absolute top-4 right-4 z-50 transition-opacity duration-300",
                      mobileControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    <button
                      type="button"
                      onClick={toggleMobileFullscreen}
                      className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full transition shadow-md border border-white/10 backdrop-blur-md"
                    >
                      <Minimize className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Warning / Info Box */}
            {!isFullscreen && (
              <div className="bg-neutral-900/60 border border-white/5 rounded-xl p-3.5 flex gap-3 text-neutral-300">
                <span className="text-lg leading-none select-none">⚠️</span>
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-bold text-white">Important Note</h4>
                  <p className="text-[11px] leading-relaxed text-neutral-400">
                    If stream is slow or not working, match may not have started or server may be overloaded. Try switching server or refreshing page.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </Shell>
    );
  }

  return (
    <Shell immersive>
      <section
        ref={playerContainerRef}
        onMouseMove={showControlsTemporarily}
        onPointerUp={handlePlayerTap}
        onFocus={showControlsTemporarily}
        className="fixed inset-0 h-screen w-screen overflow-hidden bg-black text-white"
      >
        <motion.div
          animate={{
            width: mobileLandscapeSimulated
              ? "100dvh"
              : mobileCinemaMode || !(matchCenterOpen && isLiveMatch)
                ? "100%"
                : "calc(100% - min(420px, 100vw))"
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "absolute overflow-hidden bg-black",
            mobileLandscapeSimulated
              ? "left-1/2 top-1/2 h-[100dvw] origin-center -translate-x-1/2 -translate-y-1/2 rotate-90"
              : "inset-y-0 left-0"
          )}
        >
        {activeStream && activeDiagnostics ? (
          activeDiagnostics.renderMode === "html5-video" || activeDiagnostics.renderMode === "hls-js" ? (
            <NativeStreamPlayer
              key={activeKey}
              stream={activeStream}
              title={activeLabel}
              startTime={resumeTime}
              onReady={handleStreamReady}
              onError={handleStreamFailure}
              onProgress={saveContinueProgress}
            />
          ) : (
            <iframe
              key={activeKey}
              src={activeStream.embedUrl}
              title={activeLabel}
              allow="fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={handleStreamReady}
              onError={() => handleStreamFailure()}
              className="absolute inset-0 h-full w-full border-0"
            />
          )
        ) : null}

        {!isExitingStream && isPlayerLoading ? (
          <PlayerSkeleton />
        ) : !isExitingStream && streams.isError ? (
          <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
            <div>
              <h1 className="text-xl font-semibold text-white">Unable to load stream</h1>
              <button type="button" onClick={() => void streams.refetch()} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">Retry</button>
            </div>
          </div>
        ) : !isExitingStream && !activeStream ? (
          <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
            <div>
              <h1 className="text-xl font-semibold text-white">No stream servers available</h1>
              <button type="button" onClick={target.retry} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">Retry</button>
            </div>
          </div>
        ) : null}

        {!isExitingStream && switching ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="text-center"><div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-white/20 bg-white/10" /><p className="mt-4 text-sm font-semibold text-white/72">Loading stream...</p></div>
          </div>
        ) : null}

        <AnimatePresence>
          {!isExitingStream && toast ? (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm font-medium text-white shadow-premium backdrop-blur-2xl">
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!isExitingStream ? <motion.div animate={{ opacity: controlsVisible || serverMenuOpen ? 1 : 0 }} transition={{ duration: 0.25 }} className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/78 via-black/32 to-transparent px-5 pb-16 pt-5 sm:px-8 max-md:px-4 max-md:pb-20 max-md:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <PlayerIconButton label="Back" onClick={(event) => void handleBack(event)}>
                <ArrowLeft className="h-5 w-5" />
              </PlayerIconButton>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/58">Now Watching</p>
                <h1 className="truncate text-base font-semibold tracking-normal text-white sm:text-xl">{displayTitle}</h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <PlayerIconButton label="Favorite" active={favorite} onClick={() => setFavorite((value) => !value)}>
                <Heart className={cn("h-5 w-5", favorite && "fill-studio-accent text-studio-accent")} />
              </PlayerIconButton>
              <div className="relative">
                <PlayerIconButton label="Server" active={serverMenuOpen} onClick={() => {
                  setServerMenuOpen((open) => !open);
                  showControlsTemporarily();
                }}>
                  <Cloud className="h-5 w-5" />
                </PlayerIconButton>
                <AnimatePresence>
                  {serverMenuOpen ? (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.2 }} className="absolute right-0 top-[56px] w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-black/[0.88] p-2 shadow-premium backdrop-blur-2xl">
                      <div className="px-3 pb-2 pt-2">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-studio-muted">Servers</p>
                        <p className="mt-1 text-sm font-medium text-white">{activeLabel}</p>
                      </div>
                      <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
                        {streamList.map((stream, index) => {
                          const key = streamKey(stream, index);
                          const active = index === resolvedActiveIndex;
                          const failed = failedKeys.has(key);
                          return (
                            <button key={key} type="button" onClick={() => switchServer(index)} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-white/10", active && "bg-white/10 ring-1 ring-studio-accent/45", failed && "opacity-50")}>
                              <span>
                                <span className="text-sm font-semibold text-white">
                                  {getPredefinedServerLabel(index)}
                                </span>
                              </span>
                              {active ? <Check className="h-4 w-4 text-studio-accent" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              {isLiveMatch && !mobileCinemaMode ? (
                <PlayerIconButton label="Match Center" active={matchCenterOpen} onClick={() => setMatchCenterOpen((open) => !open)}>
                  <BarChart3 className="h-5 w-5" />
                </PlayerIconButton>
              ) : null}

              <PlayerIconButton label="Fullscreen" active={isFullscreen || mobileCinemaMode} onClick={() => void toggleFullscreen()}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </PlayerIconButton>
            </div>
          </div>
        </motion.div> : null}
        </motion.div>
        <MatchCenterPanel open={!isExitingStream && !mobileCinemaMode && matchCenterOpen && isLiveMatch} matchId={target.fixtureId} onClose={() => setMatchCenterOpen(false)} />
      </section>
    </Shell>
  );
}

