"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { HorizontalCarousel } from "@/components/HorizontalCarousel";
import { SafeImage } from "@/components/SafeImage";
import { useAuth } from "@/hooks/useAuth";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { buildResumeUrl, removeContinueWatchingItem } from "@/lib/continueWatching";

function formatProgress(watchedTime: number, duration: number) {
  const percent = duration > 0 ? Math.min(100, Math.max(0, (watchedTime / duration) * 100)) : 0;
  return `${percent}%`;
}

export function ContinueWatchingSection() {
  const auth = useAuth();
  const items = useContinueWatching();

  if (!auth.user || items.length === 0) return null;

  return (
    <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">Continue Watching</h2>
      </div>
      <HorizontalCarousel title="Continue Watching" className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4 max-md:snap-x max-md:snap-mandatory">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.videoId}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, x: -18 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative block shrink-0 max-md:snap-start"
            >
              <Link href={buildResumeUrl(item.url, item.watchedTime)} className="block" aria-label={`Resume ${item.title}`}>
                <motion.article
                  whileHover={{ y: -6, scale: 1.018 }}
                  transition={{ duration: 0.22 }}
                  className="group relative h-[190px] w-[310px] shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-studio-card shadow-[0_18px_55px_rgba(0,0,0,0.36)] sm:h-[220px] sm:w-[390px] max-md:h-[210px] max-md:w-[calc(100vw-2rem)] max-md:rounded-[20px]"
                >
                  <SafeImage src={item.thumbnail} fallbackSrc={item.thumbnail} alt={item.title} fill sizes="390px" unoptimized className="object-cover object-center transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/42 to-transparent" />
                  <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-premium transition group-hover:scale-105 max-md:right-3 max-md:top-3">
                    <Play className="h-4 w-4 fill-black" />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">Resume</p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-semibold tracking-normal text-white max-md:text-xl max-md:leading-snug max-md:[overflow-wrap:anywhere]">{item.title}</h3>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/18">
                      <div className="h-full rounded-full bg-studio-accent" style={{ width: formatProgress(item.watchedTime, item.duration) }} />
                    </div>
                  </div>
                </motion.article>
              </Link>
              <button
                type="button"
                aria-label={`Remove ${item.title} from Continue Watching`}
                onClick={() => removeContinueWatchingItem(item.videoId)}
                className="absolute left-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-black/58 text-white shadow-premium backdrop-blur-xl transition hover:bg-studio-accent hover:text-white max-md:left-3 max-md:top-3"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </HorizontalCarousel>
    </section>
  );
}


