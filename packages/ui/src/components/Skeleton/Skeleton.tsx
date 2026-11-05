import { cx } from "../../utils/cx";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: "sm" | "md" | "lg" | "pill";
  /** Renders N stacked text lines (last one shorter). */
  lines?: number;
  className?: string;
}

/** Loading placeholder matching the shape of the content it replaces. */
export function Skeleton({ width = "100%", height = 16, radius = "sm", lines, className }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <span className={cx("mio-skeleton-lines", className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={cx("mio-skeleton", `mio-skeleton--${radius}`)}
            style={{ width: i === lines - 1 ? "60%" : width, height }}
          />
        ))}
      </span>
    );
  }
  return <span className={cx("mio-skeleton", `mio-skeleton--${radius}`, className)} style={{ width, height }} aria-hidden="true" />;
}
