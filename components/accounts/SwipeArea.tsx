"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, type TouchEvent, useRef } from "react";
import { startsInHorizontalScroller, swipeDirection } from "@/lib/navigation/swipe";

export interface SwipeAreaProps {
  prevHref?: string | null;
  nextHref?: string | null;
  className?: string;
  children: ReactNode;
}

/** Touch area where a horizontal swipe opens the previous/next account, except inside horizontal scrollers. */
export function SwipeArea({ prevHref, nextHref, className, children }: SwipeAreaProps) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    // Leave horizontal scrollers (statement table, charts) to their own gesture.
    const blocked = startsInHorizontalScroller(e.target as Element, e.currentTarget);
    start.current = t && !blocked ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    const s = start.current;
    start.current = null;
    if (!s || !t) return;
    const dir = swipeDirection(t.clientX - s.x, t.clientY - s.y);
    const href = dir === "next" ? nextHref : dir === "prev" ? prevHref : null;
    if (href) router.push(href, { scroll: false });
  };

  return (
    <div data-testid="swipe-area" className={className} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
