"use client";

import { HighlightRow } from "@/components/HighlightRow";
import { useMls2026Highlights } from "@/hooks/useStreamedData";

export function MlsHighlightsSection() {
  const highlights = useMls2026Highlights();
  const items = highlights.data ?? [];

  if (highlights.isLoading && items.length === 0) {
    return (
      <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
        <div className="mb-4 h-6 w-44 animate-pulse rounded-full bg-white/10" />
        <div className="flex gap-4 overflow-hidden pb-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="aspect-video w-[310px] shrink-0 animate-pulse rounded-[22px] border border-white/10 bg-white/[0.06] sm:w-[390px]" />
          ))}
        </div>
      </section>
    );
  }

  if (highlights.isError || items.length === 0) {
    return (
      <section className="px-5 py-5 sm:px-8 lg:px-10 max-md:px-4 max-md:py-4">
        <div className="mb-4 flex items-center justify-between gap-4 max-md:mb-3">
          <h2 className="text-xl font-semibold tracking-normal text-white max-md:text-lg">MLS 2026 Highlights</h2>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-6 text-sm text-studio-muted">No highlights available</div>
      </section>
    );
  }

  return <HighlightRow title="MLS 2026 Highlights" items={items} variant="carousel" />;
}

