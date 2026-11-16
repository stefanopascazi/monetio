"use client";

import { useEffect, useState } from "react";

/** DOM id of the element marking an accordion item opened from a link. */
export const openTargetId = (id: string) => `apri-${id}`;

/** Accordion state that starts on `initialId` (e.g. `?apri=` from a link) and scrolls it into view once. */
export function useOpenTarget(initialId?: string) {
  const [open, setOpen] = useState<string[]>(initialId ? [initialId] : []);
  useEffect(() => {
    if (initialId) document.getElementById(openTargetId(initialId))?.scrollIntoView({ block: "center" });
  }, [initialId]);
  return [open, setOpen] as const;
}
