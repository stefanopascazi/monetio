"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { internalNavTarget } from "@/lib/perf/link-intent";
import { recordNav } from "@/lib/perf/nav-log";
import { isStandalone, isSwControlled, observeLongTasks } from "@/lib/perf/runtime";

/** Gives up on a navigation that never renders (aborted, failed), so the bar does not stay forever. */
export const NAV_TIMEOUT_MS = 15_000;

/**
 * Tracks taps on internal links: `pending` is true from the tap until the new route renders,
 * and each completed navigation is logged with its tap-to-render time.
 */
export function useNavigationTiming(): boolean {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, setPending] = useState(false);
  const started = useRef<{ at: number; t0: number; path: string } | null>(null);

  useEffect(() => {
    observeLongTasks();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      const path = internalNavTarget(e, new URL(window.location.href));
      if (!path) return;
      started.current = { at: Date.now(), t0: performance.now(), path };
      setPending(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        started.current = null;
        setPending(false);
      }, NAV_TIMEOUT_MS);
    };
    // Capture phase: runs before Next's Link handler calls preventDefault.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const s = started.current;
    if (!s) return;
    started.current = null;
    setPending(false);
    // Next frame: the new route has been painted.
    requestAnimationFrame(() => {
      recordNav({ at: s.at, path: s.path, ms: Math.round(performance.now() - s.t0), standalone: isStandalone(), controlled: isSwControlled() });
    });
  }, [pathname, search]);

  return pending;
}
