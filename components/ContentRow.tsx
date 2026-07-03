"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import { usePrefetchMatchCard } from "@/hooks/useStreamedData";
import { storeWatchRoute } from "@/lib/watchRouteStore";
import type { MatchCardView } from "@/services/api/types";

function isFootballMatchCard(item: MatchCardView) {
  return item.sources.length > 0 || item.teams.length > 0;
}

export const ContentRow = memo(function ContentRow({ title, items }: { title: string; items: MatchCardView[] }) {
  const router = useRouter();
  const prefetchMatch = usePrefetchMatchCard();

  const warmMatch = useCallback((item: MatchCardView) => {
    if (!item.href) return;
    router.prefetch(item.href);
    prefetchMatch(item);
  }, [prefetchMatch, router]);


  if (items.length === 0) {
    return (
      <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">{title}</h2>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-8 text-sm text-studio-muted">No {title.toLowerCase()} today</div>
      </section>
    );
  }

  return (
    <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">{title}</h2>
      </div>
      <HorizontalCarousel title={title} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4 max-md:snap-x max-md:snap-mandatory">
        {items.map((item) => {
          const showStatusBadge = isFootballMatchCard(item);
          const card = (
            <motion.article
              whileHover={{ y: -6, scale: 1.018 }}
              transition={{ duration: 0.22 }}
              className="group relative h-[190px] w-[310px] shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-studio-card shadow-[0_18px_55px_rgba(0,0,0,0.36)] sm:h-[220px] sm:w-[390px] max-md:h-[210px] max-md:w-[calc(100vw-2rem)] max-md:snap-start max-md:rounded-[20px]"
            >
              <Image src={item.thumbnail} alt="Live Football" fill sizes="390px" unoptimized className="object-cover object-center transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/38 to-transparent" />
              {showStatusBadge ? (
                <div className="absolute left-4 top-4 flex gap-2">
                  <span className={item.live ? "rounded-full bg-studio-accent px-2.5 py-1 text-xs font-semibold text-white" : "rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-semibold text-black"}>
                    {item.live ? "LIVE" : "UPCOMING"}
                  </span>
                </div>
              ) : null}
              <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-black opacity-0 shadow-premium transition group-hover:opacity-100 max-md:opacity-100">
                <Play className="h-4 w-4 fill-black" />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 max-md:p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/62 max-md:text-[11px] max-md:tracking-[0.14em]">{item.competition}</p>
                <h3 className="mt-1 line-clamp-2 text-lg font-semibold tracking-normal text-white max-md:text-xl max-md:leading-snug max-md:[overflow-wrap:anywhere]">{item.title}</h3>
                <p className="mt-1 line-clamp-1 text-sm text-studio-muted">{item.meta}</p>
              </div>
            </motion.article>
          );

          return item.href ? (
            <Link
              key={`${title}-${item.id}`}
              href={item.href}
              prefetch
              className="block shrink-0 max-md:snap-start"
              aria-label={`Play ${item.title}`}
              onMouseEnter={() => warmMatch(item)}
              onFocus={() => warmMatch(item)}
              onClick={() => storeWatchRoute(item)}
            >
              {card}
            </Link>
          ) : (
            <div key={`${title}-${item.id}`} className="shrink-0 max-md:snap-start">
              {card}
            </div>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
});

export function ContentRowSkeleton({ title }: { title: string }) {
  return (
    <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">{title}</h2>
        <div className="h-4 w-12 rounded-full bg-white/10" />
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4 max-md:snap-x max-md:snap-mandatory">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-[190px] w-[310px] shrink-0 animate-pulse rounded-[22px] border border-white/10 bg-white/10 sm:h-[220px] sm:w-[390px] max-md:h-[210px] max-md:w-[calc(100vw-2rem)] max-md:snap-start"
          />
        ))}
      </div>
    </section>
  );
}






