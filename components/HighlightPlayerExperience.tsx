"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { SafeImage } from "@/components/SafeImage";
import { useHighlightRouteTarget } from "@/hooks/useStreamedData";
import { cn } from "@/lib/utils";

function HighlightSkeleton() {
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

export function HighlightPlayerExperience({ slug }: { slug: string }) {
  const router = useRouter();
  const target = useHighlightRouteTarget(slug);
  const highlight = target.highlight;
  const playerContainerRef = useRef<HTMLElement | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function openOfficialHighlight() {
    if (!highlight) return;
    setLeaving(true);
    window.setTimeout(() => {
      window.location.assign(highlight.watchUrl);
    }, 260);
  }

  return (
    <Shell immersive>
      <section ref={playerContainerRef} className="fixed inset-0 h-screen w-screen overflow-hidden bg-black text-white">
        <motion.div animate={{ opacity: leaving ? 0.35 : 1 }} transition={{ duration: 0.26 }} className="absolute inset-0 bg-black">
          {target.isLoading ? (
            <HighlightSkeleton />
          ) : highlight?.embeddable ? (
            <iframe
              src={highlight.embedUrl}
              title={highlight.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : highlight ? (
            <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
              <SafeImage src={highlight.thumbnail} alt={highlight.title} fill sizes="100vw" unoptimized className="object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
              <div className="relative z-10 max-w-xl">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-studio-muted">Official highlight</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white">Embedding is unavailable</h1>
                <p className="mt-2 text-sm leading-6 text-studio-muted">This official video must be watched on its official page.</p>
                <button type="button" onClick={openOfficialHighlight} className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">
                  <ExternalLink className="h-4 w-4" />
                  Watch Official Highlight
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
              <div>
                <h1 className="text-xl font-semibold text-white">Unable to load highlight</h1>
                <button type="button" onClick={target.retry} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">Retry</button>
              </div>
            </div>
          )}
        </motion.div>

        <div className="pointer-events-none absolute left-6 top-6 z-40">
          <div className="pointer-events-auto">
            <PlayerIconButton label="Back" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </PlayerIconButton>
          </div>
        </div>
      </section>
    </Shell>
  );
}