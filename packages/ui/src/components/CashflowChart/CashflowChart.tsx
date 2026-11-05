"use client";

import { useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { barPath, linearScale, niceTicks } from "../../utils/chart";
import { cx } from "../../utils/cx";
import { formatMoney } from "../../utils/format";
import { ChartLegend, ChartTable, ChartTooltip } from "../ChartParts/ChartParts";

export interface CashflowPoint {
  label: string;
  incomeCents: number;
  /** Positive cents spent. */
  expenseCents: number;
}

export interface CashflowChartProps {
  data: CashflowPoint[];
  height?: number;
  currency?: string;
  title?: string;
  className?: string;
}

const M = { top: 8, right: 4, bottom: 24, left: 44 };

/** Income vs expense per period as paired columns from one baseline. */
export function CashflowChart({ data, height = 220, currency, title = "Cash flow", className }: CashflowChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...data.flatMap((d) => [d.incomeCents, d.expenseCents]));
  const ticks = niceTicks(0, max, 5);
  const top = ticks[ticks.length - 1];
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const y = linearScale([0, top], [M.top + innerH, M.top]);
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, (band - 12) / 2);
  const money = (c: number) => formatMoney(c, { currency, whole: true });

  return (
    <div className={cx("mio-chart", className)} ref={ref}>
      <ChartLegend
        items={[
          { label: "Income", color: "var(--mio-chart-1)" },
          { label: "Expenses", color: "var(--mio-chart-2)" },
        ]}
      />
      <div className="mio-chart__plot">
      <svg width={width} height={height} aria-hidden="true">
        {ticks.map((t) => (
          <g key={t}>
            <line className="mio-chart__grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text className="mio-chart__tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {formatMoney(t, { currency, whole: true, compact: t >= 1_000_000 })}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx0 = M.left + band * i + band / 2;
          return (
            <g key={d.label}>
              {hover === i && <rect className="mio-chart__hover-band" x={cx0 - band / 2} y={M.top} width={band} height={innerH} rx={6} />}
              <path d={barPath(cx0 - barW - 1, y(d.incomeCents), barW, y(0) - y(d.incomeCents))} fill="var(--mio-chart-1)" />
              <path d={barPath(cx0 + 1, y(d.expenseCents), barW, y(0) - y(d.expenseCents))} fill="var(--mio-chart-2)" />
              <text className="mio-chart__tick" x={cx0} y={height - 6} textAnchor="middle">
                {d.label}
              </text>
              <rect
                className="mio-chart__hit"
                x={cx0 - band / 2}
                y={M.top}
                width={band}
                height={innerH + M.bottom}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <ChartTooltip
          x={M.left + band * hover + band / 2}
          y={M.top + innerH / 2}
          containerWidth={width}
          title={data[hover].label}
          rows={[
            { label: "Income", color: "var(--mio-chart-1)", value: money(data[hover].incomeCents) },
            { label: "Expenses", color: "var(--mio-chart-2)", value: money(data[hover].expenseCents) },
            { label: "Net", value: formatMoney(data[hover].incomeCents - data[hover].expenseCents, { currency, whole: true, signDisplay: "always" }) },
          ]}
        />
      )}
      </div>
      <ChartTable
        caption={title}
        headers={["Period", "Income", "Expenses", "Net"]}
        rows={data.map((d) => [d.label, money(d.incomeCents), money(d.expenseCents), money(d.incomeCents - d.expenseCents)])}
      />
    </div>
  );
}
