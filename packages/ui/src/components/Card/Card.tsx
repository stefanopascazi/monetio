import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../utils/cx";

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
}

/** Soft filled block grouping one topic. No borders; tone carries meaning. */
export function Card({ title, subtitle, action, padding = "md", tone = "neutral", className, children, ...rest }: CardProps) {
  return (
    <section {...rest} className={cx("mio-card", `mio-card--${tone}`, `mio-card--pad-${padding}`, className)}>
      {(title || action) && (
        <header className="mio-card__header">
          <div className="mio-card__heading">
            {title && <h2 className="mio-card__title">{title}</h2>}
            {subtitle && <p className="mio-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="mio-card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
