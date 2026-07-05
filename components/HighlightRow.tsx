"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, Play } from "lucide-react";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import { SafeImage } from "@/components/SafeImage";
import { usePrefetchHighlight } from "@/hooks/useStreamedData";
import { storeHighlightRoute } from "@/lib/highlightRouteStore";
import type { OfficialHighlight } from "@/services/api/youtube";

type HighlightRowProps = {
  title: string;
  items: OfficialHighlight[];
  initialCount?: number;
  loadStep?: number;
  variant?: "grid" | "carousel";
  seeAllHref?: string;
  showTitle?: boolean;
};

function isExternalHighlight(item: OfficialHighlight) {
  return !item.embeddable || item.channelTitle === "FIFA" || item.source.toLowerCase().includes("fifa");
}

function formatTimeAgo(value?: string) {
  if (!value) return "Official Highlight";
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff) || diff < 0) return "Official Highlight";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function sourceBadge(item: OfficialHighlight) {
  if (item.category === "uefa-champions-league") return "UEFA";
  if (item.source.toLowerCase().includes("fifa") || item.channelTitle === "FIFA") return "FIFA";
  return item.source || item.channelTitle;
}

const HighlightCard = memo(function HighlightCard({ item, carousel = false }: { item: OfficialHighlight; carousel?: boolean }) {
  const external = isExternalHighlight(item);
  const actionLabel = external ? "Watch on YouTube" : "Watch Now";

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.018 }}
      transition={{ duration: 0.22 }}
      className={`${carousel ? "w-[310px] sm:w-[390px] max-md:w-[calc(100vw-2rem)] max-md:snap-start" : "w-full"} group relative aspect-video overflow-hidden rounded-[22px] border border-white/10 bg-studio-card shadow-[0_18px_55px_rgba(0,0,0,0.36)] max-md:rounded-[20px]`}
    >
      <SafeImage src={item.thumbnail} alt={item.title} fill sizes={carousel ? "390px" : "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} className="object-cover transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-transparent to-black/20 transition duration-300 group-hover:opacity-0" />
      <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] gap-2 max-md:left-3 max-md:top-3">
        <span className="rounded-full bg-studio-accent px-2.5 py-1 text-xs font-semibold text-white max-md:text-[11px]">Highlight</span>
        <span className="truncate rounded-full border border-white/14 bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur max-md:max-w-[130px] max-md:text-[11px]">{sourceBadge(item)}</span>
      </div>
      <p className="absolute bottom-4 left-4 rounded-full border border-white/12 bg-black/45 px-2.5 py-1 text-xs font-semibold text-white/85 backdrop-blur transition duration-300 group-hover:opacity-0 max-md:bottom-3 max-md:left-3 max-md:text-[11px]">{formatTimeAgo(item.publishedAt)}</p>
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/76 to-black/10 p-4 opacity-0 transition duration-300 group-hover:opacity-100 max-md:p-3 max-md:opacity-100">
        <p className="line-clamp-1 text-xs font-medium uppercase tracking-[0.18em] text-white/62 max-md:text-[11px] max-md:tracking-[0.14em]">{item.source || item.channelTitle}</p>
        <h3 className="mt-1 line-clamp-3 text-lg font-semibold tracking-normal text-white max-md:line-clamp-2 max-md:text-base max-md:leading-snug max-md:[overflow-wrap:anywhere]">{item.title}</h3>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white max-md:mt-2 max-md:text-xs">
          {external ? <ExternalLink className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}
          {actionLabel}
        </p>
      </div>
    </motion.article>
  );
});

export const HighlightRow = memo(function HighlightRow({ title, items, initialCount = 8, loadStep = 8, variant = "grid", seeAllHref, showTitle = true }: HighlightRowProps) {
  const router = useRouter();
  const prefetchHighlight = usePrefetchHighlight();

  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sortedItems = useMemo(() => [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)), [items]);
  const visibleItems = useMemo(() => sortedItems.slice(0, visibleCount), [sortedItems, visibleCount]);
  const hasMore = visibleCount < sortedItems.length;

  const warmHighlight = useCallback((item: OfficialHighlight) => {
    if (isExternalHighlight(item)) return;
    router.prefetch(item.href);
    prefetchHighlight(item);
  }, [prefetchHighlight, router]);


  if (sortedItems.length === 0) return null;

  const renderItem = (item: OfficialHighlight, carousel = false) => {
    const external = isExternalHighlight(item);
    const ariaLabel = external ? `Watch ${item.title} on YouTube` : `Play ${item.title}`;

    return external ? (
      <a key={item.id} href={item.watchUrl} className={carousel ? "block shrink-0 max-md:snap-start" : "block"} aria-label={ariaLabel} rel="noopener noreferrer">
        <HighlightCard item={item} carousel={carousel} />
      </a>
    ) : (
      <Link
        key={item.id}
        href={item.href}
        prefetch
        className={carousel ? "block shrink-0 max-md:snap-start" : "block"}
        aria-label={ariaLabel}
        onMouseEnter={() => warmHighlight(item)}
        onFocus={() => warmHighlight(item)}
        onClick={() => storeHighlightRoute(item)}
      >
        <HighlightCard item={item} carousel={carousel} />
      </Link>
    );
  };

  return (
    <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
      {showTitle ? (
        <div className="mb-4 flex items-center justify-between gap-4 max-md:mb-3">
          <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">{title}</h2>
          {variant === "carousel" ? (
            seeAllHref ? <Link href={seeAllHref} className="shrink-0 text-sm font-semibold text-studio-muted transition hover:text-white max-md:text-xs">See All</Link> : null
          ) : (
            <span className="text-sm font-medium text-studio-muted">{sortedItems.length} Highlights</span>
          )}
        </div>
      ) : null}
      {variant === "carousel" ? (
        <HorizontalCarousel title={title} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4 max-md:snap-x max-md:snap-mandatory">
          {sortedItems.map((item) => renderItem(item, true))}
        </HorizontalCarousel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => renderItem(item))}
          </div>
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => Math.min(count + loadStep, sortedItems.length))}
                className="rounded-2xl border border-white/12 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Load More
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
});