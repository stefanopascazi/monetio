"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, type TouchEvent, useRef } from "react";
import { swipeDirection } from "@/lib/navigation/swipe";

export interface SwipeAreaProps {
  prevHref?: string | null;
  nextHref?: string | null;
  className?: string;
  children: ReactNode;
}

/** Touch area where a horizontal swipe opens the previous/next account. */
export function SwipeArea({ prevHref, nextHref, className, children }: SwipeAreaProps) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    start.current = t ? { x: t.clientX, y: t.clientY } : null;
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
