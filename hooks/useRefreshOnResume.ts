"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RESUME_REFRESH_MS, shouldRefreshOnResume } from "@/lib/perf/resume";

/** Re-fetches the current route when the app comes back after a long time hidden. */
export function useRefreshOnResume(threshold = RESUME_REFRESH_MS) {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (shouldRefreshOnResume(hiddenAt, Date.now(), threshold)) router.refresh();
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [router, threshold]);
}
