"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";
import { messages } from "../../i18n";

export type CardTone = "neutral" | "mint" | "coral" | "forecast" | "raised";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  /** Secondary line under the title. */
  subtitle?: ReactNode;
  /** Top-right slot: a ghost Button, SegmentedControl or link. */
  action?: ReactNode;
  padding?: "none" | "md" | "lg";
  /**
   * Fill color of the block. "neutral" for most content; "mint", "coral" and "forecast"
   * tint a card by meaning (money in / attention / not yet happened); "raised" for white sheets.
   */
  tone?: CardTone;
  /** Adds a chevron that folds the body away, keeping the header visible. */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Soft filled block grouping one topic. No borders; tone carries meaning. */
export function Card({
  title,
  subtitle,
  action,
  padding = "md",
  tone = "neutral",
  collapsible = false,
  open,
  defaultOpen = true,
  onOpenChange,
  className,
  children,
  ...rest
}: CardProps) {
  const id = useId();
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  const expanded = !collapsible || isOpen;
  return (
    <section {...rest} className={cx("mio-card", `mio-card--${tone}`, `mio-card--pad-${padding}`, collapsible && !expanded && "is-collapsed", className)}>
      {(title || action || collapsible) && (
        <header className="mio-card__header">
          <div className="mio-card__heading">
            {title && <h2 className="mio-card__title">{title}</h2>}
            {subtitle && <p className="mio-card__subtitle">{subtitle}</p>}
          </div>
          {(action || collapsible) && (
            <div className="mio-card__action">
              {expanded && action}
              {collapsible && (
                <button
                  type="button"
                  className="mio-card__toggle"
                  aria-expanded={expanded}
                  aria-controls={`${id}-body`}
                  aria-label={expanded ? messages.collapse : messages.expand}
                  onClick={() => setOpen(!isOpen)}
                >
                  <ChevronDown aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </header>
      )}
      {collapsible ? (
        <div id={`${id}-body`} hidden={!expanded}>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
