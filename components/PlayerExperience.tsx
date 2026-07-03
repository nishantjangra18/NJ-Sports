"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BarChart3, Check, Cloud, Heart, Maximize, Minimize } from "lucide-react";
import type HlsInstance from "hls.js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MatchCenterPanel } from "@/components/MatchCenterPanel";
import { Shell } from "@/components/Shell";
import { cn } from "@/lib/utils";
import { useStreams, useWatchRouteTarget } from "@/hooks/useStreamedData";
import type { StreamedStream } from "@/services/api/types";

const iframeLoadTimeoutMs = 12000;
type PlayerRenderMode = "html5-video" | "hls-js" | "video-js" | "iframe" | "third-party";
type HlsPlayer = HlsInstance;

function streamKey(stream: StreamedStream, index: number) {
  return `${stream.id}-${index}-${stream.embedUrl}`;
}

function streamLabel(stream: StreamedStream, index: number, recommendedIndex: number | null) {
  const language = stream.language?.trim();
  const quality = stream.quality?.trim();
  if (language && quality) return `${language} ${quality}`;
  if (language) return language;
  if (recommendedIndex === index) return "Recommended";
  if (index === 1 || (recommendedIndex !== null && index === 0 && recommendedIndex !== 0)) return "Backup Server";
  if (index > 1) return `Mirror ${index - 1}`;
  return "Backup Server";
}

function streamSourceLabel(stream: StreamedStream, index: number) {
  return stream.serverName?.trim() || stream.source?.trim() || `Server ${index + 1}`;
}

function streamLanguageLabel(stream: StreamedStream) {
  return stream.language?.trim() || "Default";
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

function logAutoplayError(stage: string, error: unknown) {
  const browserError = error instanceof DOMException || error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
  console.error(`[streamed.pk] autoplay failed during ${stage}`, browserError);
}

function findAccessibleVideo(container: HTMLElement | null) {
  if (!container) return null;
  const localVideo = container.querySelector("video");
  if (localVideo) return localVideo;

  for (const frame of Array.from(container.querySelectorAll("iframe"))) {
    try {
      const frameVideo = frame.contentDocument?.querySelector("video") ?? null;
      if (frameVideo) return frameVideo;
    } catch {
      console.warn("[streamed.pk] iframe video is cross-origin; autoplay cannot be forced from NJ Sports.");
    }
  }

  return null;
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

function NativeStreamPlayer({ stream, title, onReady, onError }: { stream: StreamedStream; title: string; onReady: () => void; onError: (message?: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readyRef = useRef(false);
  const hlsUrl = isHlsUrl(stream.embedUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    readyRef.current = false;
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";

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

  return (
    <video
      key={stream.embedUrl}
      ref={videoRef}
      title={title}
      className="absolute inset-0 h-full w-full bg-black object-contain"
      autoPlay
      muted
      playsInline
      controls
      onCanPlay={() => {
        if (!hlsUrl) onReady();
      }}
      onLoadedMetadata={() => {
        if (!hlsUrl && videoRef.current?.readyState) onReady();
      }}
      onError={() => onError("Unable to load selected server.")}
    />
  );
}

function PlayerIconButton({ label, onClick, active, children }: { label: string; onClick?: () => void; active?: boolean; children: ReactNode }) {
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
  const target = useWatchRouteTarget(slug);
  const streams = useStreams(target.source, target.id);
  const playerContainerRef = useRef<HTMLElement | null>(null);
  const mediaElementRef = useRef<HTMLVideoElement | null>(null);
  const hideControlsTimer = useRef<number | null>(null);
  const iframeLoadTimer = useRef<number | null>(null);
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
  const [matchCenterOpen, setMatchCenterOpen] = useState(false);
  const streamList = streams.data ?? [];
  const activeStream = streamList[activeStreamIndex] ?? streamList[0];
  const resolvedActiveIndex = activeStream ? Math.max(0, streamList.indexOf(activeStream)) : 0;
  const activeKey = activeStream ? streamKey(activeStream, resolvedActiveIndex) : "";
  const activeLabel = activeStream ? streamLabel(activeStream, resolvedActiveIndex, recommendedIndex) : "Stream";
  const activeDiagnostics = activeStream ? getPlayerDiagnostics(activeStream) : null;
  const title = target.title ?? "Live Stream";
  const isLiveMatch = target.live === true;
  const isPlayerLoading = target.isResolving || streams.isLoading || (!activeStream && Boolean(target.source && target.id));

  function syncMediaElement() {
    const nextMedia = findAccessibleVideo(playerContainerRef.current);
    mediaElementRef.current = nextMedia;
    return nextMedia;
  }

  async function attemptAutoplay() {
    const media = syncMediaElement();
    if (!media) {
      if (activeDiagnostics?.crossOriginEmbed) {
        console.warn("[streamed.pk] autoplay skipped: the selected player is cross-origin, so NJ Sports cannot call video.play() inside it.", { stream: activeStream });
      }
      return;
    }

    media.autoplay = true;
    media.muted = true;
    media.defaultMuted = true;
    media.playsInline = true;

    try {
      await media.play();
      console.info("[streamed.pk] autoplay succeeded", { muted: media.muted, playsInline: media.playsInline, url: activeStream?.embedUrl });
    } catch (error) {
      logAutoplayError("muted video.play()", error);
      setToast("Tap play to start stream");
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    setActiveStreamIndex(0);
    setPreviousWorkingIndex(null);
    setRecommendedIndex(null);
    setFailedKeys(new Set());
    setMatchCenterOpen(false);
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
    if (activeDiagnostics.crossOriginEmbed) {
      console.warn("[streamed.pk] autoplay cannot be forced for iframe/embed players because the provider player is cross-origin.", { url: activeStream.embedUrl });
    }
  }, [activeDiagnostics, activeKey, activeStream]);

  useEffect(() => {
    if (!activeStream) return;
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
    setSwitching(false);
    setPreviousWorkingIndex(resolvedActiveIndex);
    setFailedKeys((current) => {
      const next = new Set(current);
      next.delete(activeKey);
      return next;
    });
    setRecommendedIndex((current) => current ?? resolvedActiveIndex);
    window.setTimeout(() => void attemptAutoplay(), 0);
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

  async function toggleFullscreen() {
    const container = playerContainerRef.current;
    if (!container) return;
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    await container.requestFullscreen();
  }

  return (
    <Shell immersive>
      <section
        ref={playerContainerRef}
        onMouseMove={showControlsTemporarily}
        onFocus={showControlsTemporarily}
        className="fixed inset-0 h-screen w-screen overflow-hidden bg-black text-white"
      >
        <motion.div
          animate={{ width: matchCenterOpen && isLiveMatch ? "calc(100% - min(420px, 100vw))" : "100%" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 overflow-hidden bg-black"
        >
        {activeStream && activeDiagnostics ? (
          activeDiagnostics.renderMode === "html5-video" || activeDiagnostics.renderMode === "hls-js" ? (
            <NativeStreamPlayer
              key={activeKey}
              stream={activeStream}
              title={activeLabel}
              onReady={handleStreamReady}
              onError={handleStreamFailure}
            />
          ) : (
            <iframe
              key={activeKey}
              src={activeStream.embedUrl}
              title={activeLabel}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={handleStreamReady}
              onError={() => handleStreamFailure()}
              className="absolute inset-0 h-full w-full border-0"
            />
          )
        ) : null}

        {isPlayerLoading ? (
          <PlayerSkeleton />
        ) : streams.isError ? (
          <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
            <div>
              <h1 className="text-xl font-semibold text-white">Unable to load stream</h1>
              <button type="button" onClick={() => void streams.refetch()} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">Retry</button>
            </div>
          </div>
        ) : !activeStream ? (
          <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
            <div>
              <h1 className="text-xl font-semibold text-white">No stream servers available</h1>
              <button type="button" onClick={target.retry} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">Retry</button>
            </div>
          </div>
        ) : null}

        {switching ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="h-14 w-14 animate-pulse rounded-full border border-white/20 bg-white/10" />
          </div>
        ) : null}

        <AnimatePresence>
          {toast ? (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm font-medium text-white shadow-premium backdrop-blur-2xl">
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div animate={{ opacity: controlsVisible || serverMenuOpen ? 1 : 0 }} transition={{ duration: 0.25 }} className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/78 via-black/32 to-transparent px-5 pb-16 pt-5 sm:px-8">
          <div className="pointer-events-auto flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <PlayerIconButton label="Back" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </PlayerIconButton>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/58">Now Watching</p>
                <h1 className="truncate text-base font-semibold tracking-normal text-white sm:text-xl">{title}</h1>
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
                                <span className="text-sm font-semibold text-white">Server {index + 1}</span>
                                <span className="mt-1 block text-xs leading-5 text-studio-muted">Source: {streamSourceLabel(stream, index)}</span>
                                <span className="block text-xs leading-5 text-studio-muted">Language: {streamLanguageLabel(stream)}</span>
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
              {isLiveMatch ? (
                <PlayerIconButton label="Match Center" active={matchCenterOpen} onClick={() => setMatchCenterOpen((open) => !open)}>
                  <BarChart3 className="h-5 w-5" />
                </PlayerIconButton>
              ) : null}

              <PlayerIconButton label="Fullscreen" active={isFullscreen} onClick={() => void toggleFullscreen()}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </PlayerIconButton>
            </div>
          </div>
        </motion.div>
        </motion.div>
        <MatchCenterPanel open={matchCenterOpen && isLiveMatch} matchId={target.fixtureId} onClose={() => setMatchCenterOpen(false)} />
      </section>
    </Shell>
  );
}