"use client";

import { SafeImage } from "@/components/SafeImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useFifaWorldCupHighlights, usePrefetchHighlight, usePrefetchMatchCard, useUefaChampionsLeagueHighlights } from "@/hooks/useStreamedData";
import { storeHighlightRoute } from "@/lib/highlightRouteStore";
import { storeWatchRoute } from "@/lib/watchRouteStore";
import { cn } from "@/lib/utils";
import type { MatchCardView } from "@/services/api/types";

type HeroProps = {
  slides: MatchCardView[];
  isLoading?: boolean;
};

type AppTheme = "default" | "fifa";

const autoplayMs = 4500;
const autoplayResumeDelayMs = 3000;

function slideIdentity(slide?: MatchCardView) {
  return slide?.youtubeId ?? slide?.id ?? "";
}

function slideRenderKey(slide: MatchCardView) {
  return slide.youtubeId ?? `${slide.id}-${slide.publishedAt ?? slide.href ?? slide.slug}`;
}

function isMatchSlide(slide?: MatchCardView) {
  return Boolean(slide && (slide.sources.length > 0 || slide.teams.length > 0));
}

function statusBadgeLabel(slide: MatchCardView) {
  if (slide.live) return "LIVE";
  if (isMatchSlide(slide)) return "UPCOMING";
  return slide.badge ?? "Highlight";
}

export const Hero = memo(function Hero({ slides, isLoading = false }: HeroProps) {
  const router = useRouter();
  const prefetchMatch = usePrefetchMatchCard();
  const prefetchHighlight = usePrefetchHighlight();
  const uefaHighlights = useUefaChampionsLeagueHighlights();
  const fifaHighlights = useFifaWorldCupHighlights();
  const touchStartX = useRef<number | null>(null);
  const desktopCarouselRef = useRef<HTMLDivElement | null>(null);
  const autoplayPausedUntilRef = useRef(0);
  const autoplayIntervalRef = useRef<number | null>(null);
  const desktopDragState = useRef({ active: false, dragged: false, startX: 0, scrollLeft: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [appTheme, setAppTheme] = useState<AppTheme>("default");
  const fifaSlides = useMemo(() => slides.filter(isMatchSlide), [slides]);
  const activeSlides = appTheme === "fifa" ? fifaSlides : slides;
  const hasSlides = activeSlides.length > 0;
  const hero = activeSlides[activeIndex] ?? activeSlides[0];

  const thumbnailSlides = useMemo(() => {
    if (slides.length < 2) return [];
    const seen = new Set<string>();
    const thumbnails: Array<{ slide: MatchCardView; index: number }> = [];

    for (let offset = 0; offset < slides.length && thumbnails.length < 7; offset += 1) {
      const index = (activeIndex + offset) % slides.length;
      const slide = slides[index];
      const identity = slideIdentity(slide);
      if (!slide || seen.has(identity)) continue;
      seen.add(identity);
      thumbnails.push({ slide, index });
    }

    return thumbnails;
  }, [activeIndex, slides]);
  const setSlide = useCallback((index: number) => {
    if (activeSlides.length === 0) return;
    setActiveIndex(((index % activeSlides.length) + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    function syncAppTheme(event?: Event) {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      const theme = detail === "fifa" || document.documentElement.getAttribute("data-theme") === "fifa" || window.localStorage.getItem("app_theme") === "fifa" ? "fifa" : "default";
      setAppTheme(theme);
    }

    syncAppTheme();
    window.addEventListener("app-theme-change", syncAppTheme);
    window.addEventListener("storage", syncAppTheme);
    return () => {
      window.removeEventListener("app-theme-change", syncAppTheme);
      window.removeEventListener("storage", syncAppTheme);
    };
  }, []);

  const pauseAutoplay = useCallback(() => {
    autoplayPausedUntilRef.current = Date.now() + autoplayResumeDelayMs;
  }, []);

  const nextSlide = useCallback(() => {
    if (activeSlides.length === 0) return;
    setActiveIndex((current) => (current + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const previousSlide = useCallback(() => {
    if (activeSlides.length === 0) return;
    setActiveIndex((current) => (current - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);
  const warmSlide = useCallback((slide?: MatchCardView) => {
    if (!slide) return;
    const highlight = [...(fifaHighlights.data ?? []), ...(uefaHighlights.data ?? [])].find((item) => item.href === slide.href);
    if (highlight) {
      if (highlight.embeddable) {
        router.prefetch(highlight.href);
        prefetchHighlight(highlight);
      }
      return;
    }
    if (slide.href) router.prefetch(slide.href);
    prefetchMatch(slide);
  }, [fifaHighlights.data, prefetchHighlight, prefetchMatch, uefaHighlights.data, router]);

  useEffect(() => {
    if (activeIndex >= activeSlides.length) setActiveIndex(0);
  }, [activeIndex, activeSlides.length]);

  useEffect(() => {
    if (autoplayIntervalRef.current) window.clearInterval(autoplayIntervalRef.current);
    if (activeSlides.length < 2) return;

    autoplayIntervalRef.current = window.setInterval(() => {
      if (Date.now() < autoplayPausedUntilRef.current) return;
      setActiveIndex((current) => (current + 1) % activeSlides.length);
    }, autoplayMs);

    return () => {
      if (autoplayIntervalRef.current) window.clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    };
  }, [activeSlides.length]);

  useEffect(() => {
    warmSlide(activeSlides[(activeIndex + 1) % Math.max(activeSlides.length, 1)]);
  }, [activeIndex, activeSlides, warmSlide]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      pauseAutoplay();
      nextSlide();
    }
    if (event.key === "ArrowLeft") {
      pauseAutoplay();
      previousSlide();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    pauseAutoplay();
    touchStartX.current = event.clientX;
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (touchStartX.current === null) return;
    const delta = event.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) nextSlide();
    else previousSlide();
  }

  function handleDesktopCarouselPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    pauseAutoplay();
    const container = desktopCarouselRef.current;
    if (!container) return;
    desktopDragState.current = { active: true, dragged: false, startX: event.clientX, scrollLeft: container.scrollLeft };
    container.setPointerCapture(event.pointerId);
  }

  function handleDesktopCarouselPointerMove(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    const container = desktopCarouselRef.current;
    const drag = desktopDragState.current;
    if (!container || !drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 6) drag.dragged = true;
    container.scrollLeft = drag.scrollLeft - distance;
  }

  function handleDesktopCarouselPointerUp(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    const container = desktopCarouselRef.current;
    if (container?.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    desktopDragState.current.active = false;
  }

  function handleDesktopThumbClick(index: number) {
    pauseAutoplay();
    if (desktopDragState.current.dragged) {
      desktopDragState.current.dragged = false;
      return;
    }
    setSlide(index);
  }


  if (isLoading || !hero || !hasSlides) {
    return (
      <section className="relative h-[84vh] overflow-hidden bg-studio-bg">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,#070707_0%,#111111_45%,#070707_100%)]" />
        <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end px-5 pb-16 pt-8 sm:px-8 sm:pt-9 lg:px-10 lg:pt-10">
          <div className="max-w-3xl space-y-5">
            <div className="h-7 w-32 rounded-full bg-white/10" />
            <div className="h-4 w-56 rounded-full bg-white/10" />
            <div className="h-16 w-full max-w-2xl rounded-2xl bg-white/10" />
            <div className="h-5 w-80 rounded-full bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  const watchButton = (
    <button
      type="button"
      className="inline-flex h-13 items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-black shadow-premium transition hover:scale-[1.02] max-md:h-12 max-md:justify-center max-md:rounded-full max-md:px-4 max-md:py-3"
    >
      <Play className="h-5 w-5 fill-black" />
      Watch Now
    </button>
  );
  const heroIsMatchSlide = isMatchSlide(hero);
  const heroHighlight = [...(fifaHighlights.data ?? []), ...(uefaHighlights.data ?? [])].find((item) => item.href === hero.href);
  const heroIsExternalHighlight = Boolean(heroHighlight && !heroHighlight.embeddable);

  const fifaWatchButton = (
    <button
      type="button"
      className="fifa-hero-primary inline-flex h-13 items-center gap-3 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-premium transition hover:scale-[1.02] max-md:h-12 max-md:justify-center max-md:rounded-full max-md:px-4 max-md:py-3"
    >
      <Play className="h-5 w-5 fill-white" />
      Watch Now
    </button>
  );
  const fifaWatchCta = hero.href ? (
    heroIsExternalHighlight ? (
      <a href={hero.href} onMouseEnter={() => warmSlide(hero)} onFocus={() => warmSlide(hero)} rel="noopener noreferrer">
        {fifaWatchButton}
      </a>
    ) : (
      <Link href={hero.href} prefetch onMouseEnter={() => warmSlide(hero)} onFocus={() => warmSlide(hero)} onClick={() => {
        if (heroHighlight) storeHighlightRoute(heroHighlight);
        else storeWatchRoute(hero);
      }}>
        {fifaWatchButton}
      </Link>
    )
  ) : fifaWatchButton;

  if (appTheme === "fifa") {
    return (
      <section className="fifa-worldcup-hero relative h-[84vh] min-h-[640px] overflow-hidden outline-none max-md:h-[68vh] max-md:min-h-[540px] max-md:max-h-[680px]" aria-label="FIFA World Cup featured match">
        <div className="fifa-worldcup-hero-scene absolute inset-0" />
        <div className="fifa-worldcup-hero-ribbons absolute inset-0" />
        <div className="fifa-worldcup-trophy-mark absolute" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,18,0.92)_0%,rgba(5,7,18,0.58)_42%,rgba(5,7,18,0.24)_70%,rgba(5,7,18,0.82)_100%)] max-md:bg-[linear-gradient(180deg,rgba(5,7,18,0.34)_0%,rgba(5,7,18,0.62)_42%,rgba(5,7,18,0.94)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#050713] to-transparent" />

        <div className="relative z-10 flex h-full max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-10">
          <motion.div
            key={slideRenderKey(hero)}
            initial={{ opacity: 0, x: -26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="fifa-worldcup-hero-panel max-w-[min(40rem,48vw)] rounded-[28px] border px-7 py-8 backdrop-blur-2xl max-md:max-w-none max-md:px-5 max-md:py-6"
          >
            <span className="fifa-worldcup-kicker inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.22em]">
              {heroIsMatchSlide ? (hero.live ? "Live Match" : "Upcoming Match") : "FIFA World Cup"}
            </span>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-cyan-100/80 max-md:text-[11px]">{hero.competition || "FIFA World Cup 2026"}</p>
            <h1 className="mt-3 max-w-[36rem] text-5xl font-black leading-[0.95] tracking-normal text-white [overflow-wrap:anywhere] md:text-6xl lg:text-7xl max-md:text-[clamp(2.6rem,13vw,4rem)]">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/78 max-md:text-sm max-md:leading-6">{hero.meta}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {fifaWatchCta}
              <button type="button" className="fifa-hero-secondary inline-flex h-13 items-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold text-white transition hover:scale-[1.02] max-md:h-12 max-md:rounded-full max-md:px-4 max-md:py-3">
                <Plus className="h-5 w-5" />
                Add Favorite
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
  return (
    <section
      className="relative h-[84vh] overflow-hidden outline-none max-md:h-[68vh] max-md:min-h-[520px] max-md:max-h-[620px]"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Live football hero carousel"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slideRenderKey(hero)}
          initial={{ opacity: 0, scale: 1.018 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <SafeImage src={hero.thumbnail} fallbackSrc={hero.thumbnail} alt={hero.title} fill priority unoptimized className="object-cover object-right md:object-[right_center] max-md:scale-110 max-md:blur-2xl max-md:opacity-55" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,0.94)_22%,rgba(7,7,7,0.62)_45%,rgba(7,7,7,0.16)_70%,#070707_100%)] max-md:bg-[linear-gradient(180deg,rgba(7,7,7,0.18)_0%,rgba(7,7,7,0.55)_45%,#070707_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-studio-bg to-transparent" />

      <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end px-5 pb-36 pt-8 sm:px-8 sm:pb-40 sm:pt-9 lg:px-10 lg:pb-36 lg:pt-10 max-md:hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slideRenderKey(hero)}
            initial={{ opacity: 0, x: 34, y: heroIsMatchSlide ? 0 : 48 }}
            animate={{ opacity: 1, x: 0, y: heroIsMatchSlide ? 0 : 48 }}
            exit={{ opacity: 0, x: -24, y: heroIsMatchSlide ? 0 : 48 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-[min(42rem,46vw)] rounded-r-[34px] py-7 pr-8 before:absolute before:-inset-x-8 before:-inset-y-5 before:-z-10 before:bg-[radial-gradient(ellipse_at_left,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.48)_42%,rgba(0,0,0,0)_72%)] before:blur-xl xl:max-w-[48rem]"
          >
            <div className="mb-5 flex flex-wrap items-center gap-3 max-md:mb-3 max-md:gap-2">
              {heroIsMatchSlide ? (
                <span className={hero.live ? "rounded-full bg-studio-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white" : "rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black"}>
                  {hero.live ? "LIVE" : "UPCOMING"}
                </span>
              ) : null}
              {!heroIsMatchSlide && hero.badge ? (
                <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                  {hero.badge}
                </span>
              ) : null}
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-studio-muted max-md:mb-2 max-md:text-[11px] max-md:tracking-[0.18em]">{hero.competition}</p>
            <h1 className="line-clamp-2 max-w-[44rem] text-4xl font-semibold leading-[1.02] tracking-normal text-white [overflow-wrap:anywhere] md:text-5xl lg:text-6xl lg:leading-[1.01] 2xl:text-[4.75rem]">
              {hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 lg:text-base">{hero.meta}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3 max-md:mt-5 max-md:grid max-md:grid-cols-2">
              {hero.href ? (
                heroIsExternalHighlight ? (
                  <a href={hero.href} onMouseEnter={() => warmSlide(hero)} onFocus={() => warmSlide(hero)} rel="noopener noreferrer">
                    {watchButton}
                  </a>
                ) : (
                  <Link href={hero.href} prefetch onMouseEnter={() => warmSlide(hero)} onFocus={() => warmSlide(hero)} onClick={() => {
                      if (heroHighlight) storeHighlightRoute(heroHighlight);
                      else storeWatchRoute(hero);
                    }}>
                    {watchButton}
                  </Link>
                )
              ) : watchButton}
              <button
                type="button"
                className="inline-flex h-13 items-center gap-3 rounded-2xl border border-white/12 bg-white/10 px-6 py-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 max-md:h-12 max-md:justify-center max-md:rounded-full max-md:px-4 max-md:py-3"
              >
                <Plus className="h-5 w-5" />
                Add Favorite
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>

      {thumbnailSlides.length > 0 ? (
        <>
      <div className="relative z-10 flex h-full flex-col justify-end overflow-visible pb-7 pt-16 md:hidden">
        <div
          className="flex pb-2 transition-transform duration-500 ease-in-out will-change-transform [touch-action:pan-y]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, index) => {
            const active = index === activeIndex;
            const matchSlide = isMatchSlide(slide);
            const highlight = [...(fifaHighlights.data ?? []), ...(uefaHighlights.data ?? [])].find((item) => item.href === slide.href);
            const externalHighlight = Boolean(highlight && !highlight.embeddable);
            const cardContent = (
              <motion.div
                animate={{ scale: active ? 1 : 0.92, opacity: active ? 1 : 0.72 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className={cn("group relative h-[390px] w-[82vw] max-w-[330px] shrink-0 overflow-hidden rounded-[26px] border border-white/12 shadow-[0_22px_70px_rgba(0,0,0,0.48)]", matchSlide ? "bg-studio-card" : "bg-transparent")}
              >
                <SafeImage
                  src={slide.thumbnail}
                  fallbackSrc={slide.thumbnail}
                  alt={slide.title}
                  fill
                  sizes="82vw"
                  unoptimized
                  className={cn(
                    "object-cover transition duration-500 group-active:scale-105",
                    matchSlide ? "object-center" : "translate-x-[8%] scale-[1.36] object-right"
                  )}
                />
                <div className={cn(
                  "absolute inset-0",
                  matchSlide
                    ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.16)_38%,rgba(0,0,0,0.88)_100%)]"
                    : "bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_56%,rgba(0,0,0,0.72)_100%)]"
                )} />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                    slide.live || !matchSlide ? "bg-studio-accent text-white" : "bg-yellow-400 text-black"
                  )}>
                    {statusBadgeLabel(slide)}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 pr-16">
                  <p className="mb-2 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">{slide.competition}</p>
                  <h1 className="line-clamp-2 text-2xl font-semibold leading-[1.05] tracking-normal text-white [overflow-wrap:anywhere]">{slide.title}</h1>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/72">{slide.meta}</p>
                </div>
                <span className="absolute bottom-5 right-4 grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-premium">
                  <Play className="h-5 w-5 fill-black" />
                </span>
              </motion.div>
            );

            return (
              <div key={slideRenderKey(slide)} className="flex w-full shrink-0 snap-center justify-center px-4">
                {slide.href ? (
                  externalHighlight ? (
                    <a href={slide.href} onMouseEnter={() => warmSlide(slide)} onFocus={() => warmSlide(slide)} rel="noopener noreferrer" aria-label={`Watch ${slide.title}`}>
                      {cardContent}
                    </a>
                  ) : (
                    <Link
                      href={slide.href}
                      prefetch
                      onMouseEnter={() => warmSlide(slide)}
                      onFocus={() => warmSlide(slide)}
                      onClick={() => {
                        if (highlight) storeHighlightRoute(highlight);
                        else storeWatchRoute(slide);
                      }}
                      aria-label={`Watch ${slide.title}`}
                    >
                      {cardContent}
                    </Link>
                  )
                ) : cardContent}
              </div>
            );
          })}
        </div>
      </div>
        <div className="absolute bottom-7 right-0 z-20 w-[min(48vw,560px)] pr-5 sm:pr-8 lg:pr-10 max-md:hidden">
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              aria-label="Previous football slide"
              onClick={() => {
                pauseAutoplay();
                previousSlide();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-premium backdrop-blur transition hover:bg-white/12"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              ref={desktopCarouselRef}
              onPointerDown={handleDesktopCarouselPointerDown}
              onPointerMove={handleDesktopCarouselPointerMove}
              onPointerUp={handleDesktopCarouselPointerUp}
              onPointerCancel={handleDesktopCarouselPointerUp}
              className="no-scrollbar flex w-[min(36vw,430px)] cursor-grab snap-x snap-mandatory gap-2.5 overflow-x-auto overflow-y-visible scroll-smooth py-2 pr-[clamp(3.75rem,7vw,6rem)] active:cursor-grabbing xl:w-[460px]"
            >
              {thumbnailSlides.map(({ slide, index }) => {
                const active = index === activeIndex;
                return (
                  <motion.button
                    key={slideRenderKey(slide)}
                    type="button"
                    onClick={() => handleDesktopThumbClick(index)}
                    onMouseEnter={() => warmSlide(slide)}
                    onFocus={() => warmSlide(slide)}
                    animate={{ y: active ? -2 : 0, scale: active ? 1 : 0.96, opacity: active ? 1 : 0.76 }}
                    whileHover={{ opacity: 1, y: -2 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "group relative h-[82px] w-[168px] shrink-0 snap-start overflow-hidden rounded-xl border bg-black/45 text-left shadow-premium backdrop-blur outline-none transition-colors xl:h-[92px] xl:w-[184px]",
                      active ? "border-white/80 shadow-[0_0_28px_rgba(255,255,255,0.22)]" : "border-white/12 hover:border-white/45"
                    )}
                    aria-label={`Show ${slide.title}`}
                    aria-current={active ? "true" : undefined}
                  >
                    <SafeImage src={slide.thumbnail} fallbackSrc={slide.thumbnail} alt={slide.title} fill sizes="(min-width: 1280px) 184px, 168px" unoptimized className="object-cover object-[right_center] transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.44)_52%,rgba(0,0,0,0.12)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 pr-10">
                      <span className={cn(
                        "mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em]",
                        slide.live || !isMatchSlide(slide) ? "bg-studio-accent text-white" : "bg-yellow-400 text-black"
                      )}>{statusBadgeLabel(slide)}</span>
                      <p className="line-clamp-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/62">{slide.competition}</p>
                      <h2 className="mt-0.5 line-clamp-2 max-w-[7.5rem] text-[11px] font-semibold leading-tight tracking-normal text-white xl:max-w-[8.5rem] xl:text-xs">{slide.title}</h2>
                    </div>
                    <span className="absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full bg-white text-black shadow-premium transition group-hover:scale-105">
                      <Play className="h-3.5 w-3.5 fill-black" />
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Next football slide"
              onClick={() => {
                pauseAutoplay();
                nextSlide();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-premium backdrop-blur transition hover:bg-white/12"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        </>
      ) : null}
    </section>
  );
});






































