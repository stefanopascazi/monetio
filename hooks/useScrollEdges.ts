"use client";

import { type RefObject, useEffect, useState } from "react";
import { scrollEdges } from "@/lib/navigation/carousel";

/** Tracks whether a horizontal scroller is at its start/end, on scroll and resize. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges(scrollEdges(el));
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resize?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resize?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps re-measure when the content changes
  }, [ref, ...deps]);
  return edges;
}
