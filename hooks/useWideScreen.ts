"use client";

import { useSyncExternalStore } from "react";

/** Same breakpoint as the nav rail: from here the advisor opens as a side panel instead of a page. */
export const WIDE_QUERY = "(min-width: 960px)";

const subscribe = (notify: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};

/** True on wide screens; false during server rendering. */
export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_QUERY).matches, () => false);
}
