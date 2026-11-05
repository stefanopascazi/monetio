import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

export interface LegendItem {
  label: string;
  /** CSS color, usually a chart token var. */
  color: string;
  /** "line" draws a short line key, "dashed" a dashed one, default a square swatch. */
  shape?: "swatch" | "line" | "dashed";
  value?: ReactNode;
}

/** Legend row above a chart. Text stays in ink colors; only the key carries the series color. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cx("mio-legend", className)}>
      {items.map((it) => (
        <li key={it.label} className="mio-legend__item">
          <span
            className={cx("mio-legend__key", `mio-legend__key--${it.shape ?? "swatch"}`)}
            style={{ ["--mio-key" as string]: it.color }}
            aria-hidden="true"
          />
          <span className="mio-legend__label">{it.label}</span>
          {it.value != null && <span className="mio-legend__value">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export interface TooltipRow {
  label: string;
  color?: string;
  value: ReactNode;
}

/** Floating readout positioned in chart pixel coordinates. */
export function ChartTooltip({ x, y, title, rows, containerWidth }: { x: number; y: number; title: ReactNode; rows: TooltipRow[]; containerWidth: number }) {
  // Flip to the left half when near the right edge.
  const flip = x > containerWidth * 0.6;
  return (
    <div className="mio-tooltip" role="presentation" style={{ left: x, top: y, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}>
      <p className="mio-tooltip__title">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="mio-tooltip__row">
          {r.color && <span className="mio-tooltip__key" style={{ background: r.color }} />}
          <span className="mio-tooltip__label">{r.label}</span>
          <span className="mio-tooltip__value">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Visually hidden data table, the accessible fallback for every chart. */
export function ChartTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="mio-visually-hidden">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
