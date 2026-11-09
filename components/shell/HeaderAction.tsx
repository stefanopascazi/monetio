"use client";

import { type ReactNode, useRef } from "react";
import { createPortal } from "react-dom";
import { useHiddenUnderHeader } from "@/hooks/useHiddenUnderHeader";
import { TOPBAR_ID, TOPBAR_SLOT_ID } from "./topbar-ids";

/**
 * Renders its children in place; once that spot scrolls under the sticky top bar, moves them
 * into the top bar slot so the action stays reachable.
 */
export function HeaderAction({ children }: { children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const underHeader = useHiddenUnderHeader(anchor, TOPBAR_ID);
  // Only true after an observer callback (client), so reading the DOM here never runs on the server.
  const slot = underHeader ? document.getElementById(TOPBAR_SLOT_ID) : null;
  return (
    // Fixed-size anchor keeps the observed box and the title row stable while children move.
    <span ref={anchor} className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center">
      {slot ? createPortal(children, slot) : children}
    </span>
  );
}
