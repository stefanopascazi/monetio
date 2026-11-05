"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useRef } from "react";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Small count rendered beside the label. */
  count?: number;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** "pill" (default) for most switches, "line" for long page sections. */
  variant?: "line" | "pill";
  "aria-label": string;
  className?: string;
}

/** Switches between sibling views of the same object, e.g. list / add form / import. */
export function Tabs({ tabs, value, defaultValue, onValueChange, variant = "pill", className, ...aria }: TabsProps) {
  const base = useId();
  const [active, setActive] = useControllableState(value, defaultValue ?? tabs[0]?.id, onValueChange);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={cx("mio-tabs", `mio-tabs--${variant}`, className)}>
      <div role="tablist" aria-label={aria["aria-label"]} className="mio-tabs__list">
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${base}-${t.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-${t.id}-panel`}
              tabIndex={selected ? 0 : -1}
              className={cx("mio-tabs__tab", selected && "is-selected")}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
              {t.count != null && <span className="mio-tabs__count">{t.count}</span>}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${base}-${t.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${base}-${t.id}-tab`}
          hidden={t.id !== active}
          className="mio-tabs__panel"
          tabIndex={0}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
