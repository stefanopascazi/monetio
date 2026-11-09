"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TOPBAR_SLOT_ID } from "./topbar-ids";

const subscribe = () => () => {};

/** Renders a page action (e.g. the account settings gear) in the sticky top bar slot. */
export function TopBarAction({ children }: { children: ReactNode }) {
  // Server and first hydration pass: no slot, nothing rendered; the client then portals into it.
  const slot = useSyncExternalStore(
    subscribe,
    () => document.getElementById(TOPBAR_SLOT_ID),
    () => null,
  );
  return slot ? createPortal(children, slot) : null;
}
