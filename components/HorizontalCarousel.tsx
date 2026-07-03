"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type HorizontalCarouselProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const edgeTolerance = 2;

export function HorizontalCarousel({ title, children, className = "no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4 max-md:snap-x max-md:snap-mandatory" }: HorizontalCarouselProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const node = rowRef.current;
    if (!node) return;

    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
    const nextCanScrollLeft = node.scrollLeft > edgeTolerance;
    const nextCanScrollRight = node.scrollLeft < maxScrollLeft - edgeTolerance;

    setCanScrollLeft((current) => (current === nextCanScrollLeft ? current : nextCanScrollLeft));
    setCanScrollRight((current) => (current === nextCanScrollRight ? current : nextCanScrollRight));
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      updateScrollButtons();
    });
  }, [updateScrollButtons]);

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    updateScrollButtons();
    node.addEventListener("scroll", scheduleUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(node);

    return () => {
      node.removeEventListener("scroll", scheduleUpdate);
      resizeObserver.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [scheduleUpdate, updateScrollButtons, children]);

  const scroll = useCallback((direction: "left" | "right") => {
    const node = rowRef.current;
    if (!node) return;
    node.scrollBy({ left: direction === "left" ? -node.clientWidth * 0.85 : node.clientWidth * 0.85, behavior: "smooth" });
    scheduleUpdate();
  }, [scheduleUpdate]);

  return (
    <div className="relative">
      {canScrollLeft ? (
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-black/55 text-white shadow-premium backdrop-blur transition hover:bg-white/15 max-md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      <div ref={rowRef} className={className}>
        {children}
      </div>
      {canScrollRight ? (
        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-black/55 text-white shadow-premium backdrop-blur transition hover:bg-white/15 max-md:hidden"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}