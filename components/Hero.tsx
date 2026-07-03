"use client";

import { SafeImage } from "@/components/SafeImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type UIEvent } from "react";
import { useFifaWorldCupHighlights, usePrefetchHighlight, usePrefetchMatchCard, useUefaChampionsLeagueHighlights } from "@/hooks/useStreamedData";
import { storeHighlightRoute } from "@/lib/highlightRouteStore";
import { storeWatchRoute } from "@/lib/watchRouteStore";
import { cn } from "@/lib/utils";
import type { MatchCardView } from "@/services/api/types";

type HeroProps = {
  slides: MatchCardView[];
  isLoading?: boolean;
};

const autoplayMs = 6500;

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
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasSlides = slides.length > 0;
  const hero = slides[activeIndex] ?? slides[0];

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
    if (slides.length === 0) return;
    setActiveIndex(((index % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  const nextSlide = useCallback(() => setSlide(activeIndex + 1), [activeIndex, setSlide]);
  const previousSlide = useCallback(() => setSlide(activeIndex - 1), [activeIndex, setSlide]);

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
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(nextSlide, autoplayMs);
    return () => window.clearInterval(timer);
  }, [nextSlide, slides.length]);

  useEffect(() => {
    warmSlide(slides[(activeIndex + 1) % Math.max(slides.length, 1)]);
  }, [activeIndex, slides, warmSlide]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") nextSlide();
    if (event.key === "ArrowLeft") previousSlide();
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
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

  const handleMobileCarouselScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const center = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = activeIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    Array.from(container.children).forEach((child, index) => {
      const element = child as HTMLElement;
      const childCenter = element.offsetLeft + element.clientWidth / 2;
      const distance = Math.abs(childCenter - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex) setSlide(closestIndex);
  }, [activeIndex, setSlide]);

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
          <SafeImage src={hero.thumbnail} fallbackSrc={hero.thumbnail} alt={hero.title} fill priority unoptimized className="object-cover max-md:scale-110 max-md:blur-2xl max-md:opacity-55" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,0.82)_34%,rgba(7,7,7,0.2)_72%,#070707_100%)] max-md:bg-[linear-gradient(180deg,rgba(7,7,7,0.18)_0%,rgba(7,7,7,0.55)_45%,#070707_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-studio-bg to-transparent" />

      <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end px-5 pb-40 pt-8 sm:px-8 sm:pb-44 sm:pt-9 lg:px-10 lg:pt-10 max-md:hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slideRenderKey(hero)}
            initial={{ opacity: 0, x: 34, y: heroIsMatchSlide ? 0 : 48 }}
            animate={{ opacity: 1, x: 0, y: heroIsMatchSlide ? 0 : 48 }}
            exit={{ opacity: 0, x: -24, y: heroIsMatchSlide ? 0 : 48 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={cn(heroIsMatchSlide ? "max-w-3xl" : "max-w-5xl")}
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
            <h1 className={cn("text-5xl font-semibold leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl max-md:text-[clamp(2.15rem,11vw,3.15rem)] max-md:leading-[1.04] max-md:[overflow-wrap:anywhere]", heroIsMatchSlide ? "max-w-2xl" : "max-w-5xl")}>
              {hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg max-md:mt-3 max-md:text-sm max-md:leading-6">{hero.meta}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3 max-md:mt-5 max-md:grid max-md:grid-cols-2">
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
      <div className="relative z-10 flex h-full flex-col justify-end pb-7 pt-16 md:hidden">
        <div
          ref={mobileCarouselRef}
          onScroll={handleMobileCarouselScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scroll-padding-inline:1rem]"
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
              <div key={slideRenderKey(slide)} className="snap-center">
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
        <div className="absolute inset-x-0 bottom-5 z-20 px-5 sm:px-8 lg:bottom-8 lg:px-10 max-md:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-start gap-3 lg:justify-end max-md:block">
            <button
              type="button"
              aria-label="Previous football slide"
              onClick={previousSlide}
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-premium backdrop-blur transition hover:bg-white/12 lg:grid"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto overflow-y-visible scroll-smooth px-1 py-3 sm:gap-3 lg:max-w-[calc(100vw-34rem)] xl:max-w-[940px] max-md:snap-x max-md:snap-mandatory max-md:px-4 max-md:scroll-px-4">
              {thumbnailSlides.map(({ slide, index }) => {
                const active = index === activeIndex;
                return (
                  <motion.button
                    key={slideRenderKey(slide)}
                    type="button"
                    onClick={() => setSlide(index)}
                    onMouseEnter={() => warmSlide(slide)}
                    onFocus={() => warmSlide(slide)}
                    animate={{ scale: active ? 1 : 0.9, opacity: active ? 1 : 0.7 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "group relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded-xl border bg-black/45 text-left shadow-premium backdrop-blur outline-none transition-colors sm:h-[76px] sm:w-[136px] xl:h-[84px] xl:w-[150px] max-md:h-[76px] max-md:w-[132px] max-md:snap-start",
                      active ? "border-white shadow-[0_0_24px_rgba(255,255,255,0.28)]" : "border-white/12 hover:border-white/45"
                    )}
                    aria-label={`Show ${slide.title}`}
                    aria-current={active ? "true" : undefined}
                  >
                    <SafeImage src={slide.thumbnail} fallbackSrc={slide.thumbnail} alt={slide.title} fill sizes="(min-width: 1280px) 150px, (min-width: 640px) 136px, 120px" unoptimized className="object-cover object-center transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <span className={cn(
                      "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                      slide.live || !isMatchSlide(slide) ? "bg-studio-accent text-white" : "bg-yellow-400 text-black"
                    )}>{statusBadgeLabel(slide)}</span>
                  </motion.button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Next football slide"
              onClick={nextSlide}
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-premium backdrop-blur transition hover:bg-white/12 lg:grid"
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



















