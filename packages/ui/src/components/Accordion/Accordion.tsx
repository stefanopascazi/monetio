"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  /** Right-aligned summary visible while collapsed (e.g. an Amount). */
  meta?: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** "single" closes other items when one opens. */
  type?: "single" | "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (open: string[]) => void;
  className?: string;
}

/** Vertical stack of disclosures. Use for editable groups (accounts, settings) instead of modals. */
export function Accordion({ items, type = "multiple", value, defaultValue = [], onValueChange, className }: AccordionProps) {
  const base = useId();
  const [open, setOpen] = useControllableState(value, defaultValue, onValueChange);

  const toggle = (id: string) => {
    const isOpen = open.includes(id);
    if (type === "single") setOpen(isOpen ? [] : [id]);
    else setOpen(isOpen ? open.filter((x) => x !== id) : [...open, id]);
  };

  return (
    <div className={cx("mio-accordion", className)}>
      {items.map((item) => {
        const expanded = open.includes(item.id);
        const hid = `${base}-${item.id}-h`;
        const pid = `${base}-${item.id}-p`;
        return (
          <div key={item.id} className={cx("mio-accordion__item", expanded && "is-open")}>
            <h3 className="mio-accordion__heading">
              <button
                id={hid}
                type="button"
                className="mio-accordion__trigger"
                aria-expanded={expanded}
                aria-controls={pid}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
              >
                {item.icon && <span className="mio-accordion__icon">{item.icon}</span>}
                <span className="mio-accordion__title">{item.title}</span>
                {item.meta && <span className="mio-accordion__meta">{item.meta}</span>}
                <ChevronDown className="mio-accordion__chevron" aria-hidden="true" />
              </button>
            </h3>
            <div id={pid} role="region" aria-labelledby={hid} className="mio-accordion__panel" hidden={!expanded}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
