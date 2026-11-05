"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { bandPath, linePath, linearScale, niceTicks } from "../../utils/chart";
import { cx } from "../../utils/cx";
import { formatMoney } from "../../utils/format";
import { ChartLegend, ChartTable, ChartTooltip } from "../ChartParts/ChartParts";

export interface ProjectionPoint {
  label: string;
  valueCents: number;
  /** Marks a forecast point. History points must come first. */
  projected?: boolean;
  /** Pessimistic bound for projected points. */
  lowCents?: number;
  /** Optimistic bound for projected points. */
  highCents?: number;
}

export interface ProjectionChartProps {
  data: ProjectionPoint[];
  height?: number;
  currency?: string;
  title?: string;
  className?: string;
}

const M = { top: 12, right: 72, bottom: 24, left: 52 };

/** Balance history (solid) continuing into a forecast (dashed) with a confidence band. */
export function ProjectionChart({ data, height = 240, currency, title = "Balance projection", className }: ProjectionChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return null;

  const values = data.flatMap((d) => [d.valueCents, d.lowCents ?? d.valueCents, d.highCents ?? d.valueCents]);
  // Balances rarely touch zero: fit the axis to the data range.
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const x = linearScale([0, data.length - 1], [M.left, width - M.right]);
  const y = linearScale([ticks[0], ticks[ticks.length - 1]], [height - M.bottom, M.top]);

  const firstProj = data.findIndex((d) => d.projected);
  const split = firstProj === -1 ? data.length - 1 : Math.max(0, firstProj - 1);
  const pts = data.map((d, i) => [x(i), y(d.valueCents)] as [number, number]);
  const hist = pts.slice(0, split + 1);
  const proj = firstProj === -1 ? [] : pts.slice(split);
  const projData = firstProj === -1 ? [] : data.slice(split);
  const upper = projData.map((d, i) => [proj[i][0], y(d.highCents ?? d.valueCents)] as [number, number]);
  const lower = projData.map((d, i) => [proj[i][0], y(d.lowCents ?? d.valueCents)] as [number, number]);
  const last = data[data.length - 1];
  const [lx, ly] = pts[pts.length - 1];
  const money = (c: number) => formatMoney(c, { currency, whole: true });
  // Show at most ~6 x labels.
  const every = Math.ceil(data.length / 6);

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.round(rel * (data.length - 1)));
  };

  return (
    <div className={cx("mio-chart", className)} ref={ref}>
      <ChartLegend
        items={[
          { label: "Balance", color: "var(--mio-ink)", shape: "line" },
          { label: "Projection", color: "var(--mio-forecast)", shape: "dashed" },
        ]}
      />
      <div className="mio-chart__plot">
        <svg width={width} height={height} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line className="mio-chart__grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="mio-chart__tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {formatMoney(t, { currency, whole: true, compact: Math.abs(t) >= 10_000_00 })}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % every === 0 || i === data.length - 1 ? (
              <text key={d.label} className="mio-chart__tick" x={x(i)} y={height - 6} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
          {proj.length > 1 && <path d={bandPath(upper, lower)} fill="var(--mio-forecast)" opacity="0.14" />}
          <path d={linePath(hist)} fill="none" stroke="var(--mio-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {proj.length > 1 && (
            <path d={linePath(proj)} fill="none" stroke="var(--mio-forecast)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
          )}
          {hover != null && (
            <>
              <line className="mio-chart__crosshair" x1={pts[hover][0]} x2={pts[hover][0]} y1={M.top} y2={height - M.bottom} />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill={data[hover].projected ? "var(--mio-forecast)" : "var(--mio-ink)"} stroke="var(--mio-surface)" strokeWidth="2" />
            </>
          )}
          <circle cx={lx} cy={ly} r="4" fill="var(--mio-forecast)" stroke="var(--mio-surface)" strokeWidth="2" />
          <text className="mio-chart__end-label" x={lx + 10} y={ly} dy="0.32em">
            {formatMoney(last.valueCents, { currency, compact: true })}
          </text>
          <rect
            className="mio-chart__hit"
            x={M.left}
            y={M.top}
            width={Math.max(0, width - M.left - M.right)}
            height={height - M.top - M.bottom}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
        {hover != null && (
          <ChartTooltip
            x={pts[hover][0]}
            y={pts[hover][1]}
            containerWidth={width}
            title={`${data[hover].label}${data[hover].projected ? " · projected" : ""}`}
            rows={[
              { label: data[hover].projected ? "Expected" : "Balance", value: money(data[hover].valueCents) },
              ...(data[hover].projected && data[hover].lowCents != null
                ? [{ label: "Range", value: `${money(data[hover].lowCents!)} – ${money(data[hover].highCents ?? data[hover].valueCents)}` }]
                : []),
            ]}
          />
        )}
      </div>
      <ChartTable
        caption={title}
        headers={["Period", "Balance", "Low", "High"]}
        rows={data.map((d) => [
          `${d.label}${d.projected ? " (projected)" : ""}`,
          money(d.valueCents),
          d.lowCents != null ? money(d.lowCents) : "",
          d.highCents != null ? money(d.highCents) : "",
        ])}
      />
    </div>
  );
}
