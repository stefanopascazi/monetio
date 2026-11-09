"use client";

import { type RefObject, useEffect, useState } from "react";

/** True once the element has scrolled above the bottom edge of the sticky header (not when it is below the fold). */
export function isUnderHeader(entry: Pick<IntersectionObserverEntry, "isIntersecting" | "boundingClientRect">, headerHeight: number): boolean {
  return !entry.isIntersecting && entry.boundingClientRect.top < headerHeight;
}

/** Watches an element against the viewport minus the sticky header found by id. */
export function useHiddenUnderHeader(ref: RefObject<Element | null>, headerId: string): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const headerHeight = document.getElementById(headerId)?.offsetHeight ?? 0;
    const observer = new IntersectionObserver(([entry]) => setHidden(isUnderHeader(entry, headerHeight)), {
      rootMargin: `-${headerHeight}px 0px 0px 0px`,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, headerId]);
  return hidden;
}
