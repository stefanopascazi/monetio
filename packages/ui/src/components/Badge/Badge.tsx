import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "accent"
  | "forecast"
  | "income"
  | "expense"
  | "transfer"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

/** One or two words of state. Tone always means something; pair status tones with an icon. */
export function Badge({ tone = "neutral", icon, size = "md", className, children }: BadgeProps) {
  return (
    <span className={cx("mio-badge", `mio-badge--${tone}`, `mio-badge--${size}`, className)}>
      {icon}
      {children}
    </span>
  );
}
