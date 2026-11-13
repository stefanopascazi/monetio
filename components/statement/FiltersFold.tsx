"use client";

import { SlidersHorizontal } from "lucide-react";
import { createContext, type ReactNode, useContext, useId, useState } from "react";
import { cx } from "@monetio/ui";

interface FoldState {
  open: boolean;
  toggle: () => void;
  panelId: string;
}

const FoldContext = createContext<FoldState | null>(null);

function useFold(): FoldState {
  const ctx = useContext(FoldContext);
  if (!ctx) throw new Error("FiltersFold parts must be rendered inside <FiltersFold>");
  return ctx;
}

/**
 * Phone-only fold for the statement filters: an icon in the card header opens them.
 * Wide layouts always show the panel and hide the icon (CSS breakpoint, no flash on first render).
 */
export function FiltersFold({ defaultOpen = false, children }: { defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return <FoldContext.Provider value={{ open, toggle: () => setOpen((v) => !v), panelId }}>{children}</FoldContext.Provider>;
}

export function FiltersToggle() {
  const { open, toggle, panelId } = useFold();
  return (
    <button
      type="button"
      aria-label={open ? "Nascondi filtri" : "Mostra filtri"}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
      className={cx(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full lg:hidden",
        open ? "bg-brand-soft text-brand-ink" : "bg-surface text-ink hover:bg-surface-raised",
      )}
    >
      <SlidersHorizontal className="size-5" aria-hidden="true" />
    </button>
  );
}

export function FiltersPanel({ children }: { children: ReactNode }) {
  const { open, panelId } = useFold();
  return (
    <div id={panelId} className={cx(!open && "max-lg:hidden")}>
      {children}
    </div>
  );
}
