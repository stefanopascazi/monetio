"use client";

import { useState } from "react";
import { arcPath } from "../../utils/chart";
import { cx } from "../../utils/cx";
import { formatMoney } from "../../utils/format";
import { ChartTable } from "../ChartParts/ChartParts";
import { messages } from "../../i18n";

export interface CategorySlice {
  label: string;
  valueCents: number;
}

export interface CategoryDonutProps {
  data: CategorySlice[];
  /** Center caption under the total. */
  caption?: string;
  size?: number;
  currency?: string;
  title?: string;
  className?: string;
}

/** Sorts slices and folds everything past the fifth into "Other" (max six colors). */
export function foldSlices(data: CategorySlice[], max = 6): CategorySlice[] {
  const sorted = [...data].filter((d) => d.valueCents > 0).sort((a, b) => b.valueCents - a.valueCents);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const other = sorted.slice(max - 1).reduce((s, d) => s + d.valueCents, 0);
  return [...head, { label: messages.chart.other, valueCents: other }];
}

/** Start/end angles (radians, clockwise from 12 o'clock) for each slice. */
export function sliceAngles(slices: CategorySlice[], total: number): { a0: number; a1: number }[] {
  const full = Math.PI * 2;
  const safe = Math.max(1, total);
  return slices.reduce<{ a0: number; a1: number }[]>((acc, s) => {
    const a0 = acc.length ? acc[acc.length - 1].a1 : 0;
    return [...acc, { a0, a1: a0 + (s.valueCents / safe) * full }];
  }, []);
}

/** Spending split by category with total in the center and a value legend. */
export function CategoryDonut({ data, caption = messages.chart.spent, size = 168, currency, title = messages.chart.byCategory, className }: CategoryDonutProps) {
  const [hover, setHover] = useState<number | null>(null);
  const slices = foldSlices(data);
  const total = slices.reduce((s, d) => s + d.valueCents, 0);
  const r = size / 2;
  const inner = r - 22;
  const arcs = sliceAngles(slices, total).map((a, i) => ({ ...slices[i], i, ...a }));
  const money = (c: number) => formatMoney(c, { currency, whole: true });
  const focus = hover != null ? slices[hover] : null;

  return (
    <div className={cx("mio-donut", className)}>
      <div className="mio-donut__figure" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {arcs.map((a) => (
            <path
              key={a.label}
              d={arcPath(r, r, hover === a.i ? r : r - 2, inner, a.a0, Math.max(a.a0 + 0.001, a.a1 - 0.0001))}
              fill={`var(--mio-chart-${a.i + 1})`}
              stroke="var(--mio-surface)"
              strokeWidth="2"
              opacity={hover == null || hover === a.i ? 1 : 0.45}
              onMouseEnter={() => setHover(a.i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="mio-donut__center">
          <span className="mio-donut__total">{money(focus ? focus.valueCents : total)}</span>
          <span className="mio-donut__caption">{focus ? focus.label : caption}</span>
        </div>
      </div>
      <ul className="mio-donut__legend">
        {slices.map((s, i) => (
          <li
            key={s.label}
            className={cx("mio-donut__row", hover === i && "is-active")}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="mio-donut__key" style={{ background: `var(--mio-chart-${i + 1})` }} aria-hidden="true" />
            <span className="mio-donut__label">{s.label}</span>
            <span className="mio-donut__value">{money(s.valueCents)}</span>
            <span className="mio-donut__pct">{Math.round((s.valueCents / Math.max(1, total)) * 100)}%</span>
          </li>
        ))}
      </ul>
      <ChartTable caption={title} headers={[messages.chart.category, messages.chart.amount]} rows={slices.map((s) => [s.label, money(s.valueCents)])} />
    </div>
  );
}
