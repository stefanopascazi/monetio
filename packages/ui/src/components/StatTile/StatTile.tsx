import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cx } from "../../utils/cx";
import { formatPercent } from "../../utils/format";
import { Amount } from "../Amount/Amount";
import { Sparkline } from "../Sparkline/Sparkline";

export interface StatTileProps {
  label: ReactNode;
  valueCents: number;
  /** Percent change vs the comparison period. */
  delta?: number;
  /** Comparison period, e.g. "vs October". */
  deltaLabel?: string;
  /** Whether an increase is good (true for income/balance, false for spending). */
  upIsGood?: boolean;
  trend?: number[];
  hidden?: boolean;
  currency?: string;
  /** Block fill, same meaning as Card tones. */
  tone?: "neutral" | "mint" | "coral" | "forecast";
  className?: string;
}

/** One headline figure with optional delta and 12-point trend. */
export function StatTile({
  label,
  valueCents,
  delta,
  deltaLabel,
  upIsGood = true,
  trend,
  hidden,
  currency,
  tone = "neutral",
  className,
}: StatTileProps) {
  const good = delta == null || delta === 0 ? undefined : delta > 0 === upIsGood;
  return (
    <div className={cx("mio-stat", `mio-stat--${tone}`, className)}>
      <p className="mio-stat__label">{label}</p>
      <Amount cents={valueCents} tone="neutral" size="lg" hidden={hidden} currency={currency} />
      <div className="mio-stat__foot">
        {delta != null && (
          <span className={cx("mio-stat__delta", good === true && "is-good", good === false && "is-bad")}>
            {delta >= 0 ? <ArrowUpRight aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}
            {formatPercent(delta)}
            {deltaLabel && <span className="mio-stat__delta-label">{deltaLabel}</span>}
          </span>
        )}
        {trend && trend.length > 1 && (
          <Sparkline data={trend} width={88} height={28} tone="muted" aria-label={`Trend over ${trend.length} periods`} />
        )}
      </div>
    </div>
  );
}
