import { useId } from "react";
import { linePath, linearScale } from "../../utils/chart";
import { cx } from "../../utils/cx";

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Color role of the line. */
  tone?: "brand" | "income" | "expense" | "forecast" | "accent" | "muted";
  /** Describes the trend for screen readers. */
  "aria-label": string;
  className?: string;
}

/** Tiny trend line with a soft area wash and an emphasized endpoint. */
export function Sparkline({ data, width = 120, height = 36, tone = "brand", className, ...aria }: SparklineProps) {
  const gid = useId();
  if (data.length < 2) return null;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const x = linearScale([0, data.length - 1], [pad, width - pad]);
  const y = linearScale([min, max], [height - pad, pad]);
  const pts = data.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = linePath(pts);
  const area = `${line}L${pts[pts.length - 1][0]},${height}L${pts[0][0]},${height}Z`;
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg
      className={cx("mio-spark", `mio-spark--${tone}`, className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={aria["aria-label"]}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="4" fill="currentColor" className="mio-spark__end" />
    </svg>
  );
}
