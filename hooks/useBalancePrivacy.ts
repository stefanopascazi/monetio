"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyBalancesHidden, isBalancesHidden, writeBalancesHidden } from "@/lib/privacy/balance-privacy";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Privacy mode state, read from <html> (set before paint by the init script). Server renders as visible. */
export function useBalancePrivacy() {
  const hidden = useSyncExternalStore(subscribe, () => isBalancesHidden(), () => false);
  const toggle = useCallback(() => {
    const next = !isBalancesHidden();
    applyBalancesHidden(next);
    writeBalancesHidden(next);
    listeners.forEach((l) => l());
  }, []);
  return { hidden, toggle };
}
