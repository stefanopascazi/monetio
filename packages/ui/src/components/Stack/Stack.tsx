import type { CSSProperties, ElementType, HTMLAttributes } from "react";
import { cx } from "../../utils/cx";

type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

export interface StackProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  direction?: "row" | "column";
  /** Gap as a spacing token step (4 = 16px). */
  gap?: Space;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
}

/** Flex layout primitive. Spacing between siblings always comes from `gap`, never margins. */
export function Stack({
  as: Tag = "div",
  direction = "column",
  gap = 4,
  align,
  justify,
  wrap,
  className,
  style,
  ...rest
}: StackProps) {
  return (
    <Tag
      {...rest}
      className={cx("mio-stack", className)}
      style={{
        flexDirection: direction,
        gap: gap === 0 ? 0 : `var(--mio-space-${gap})`,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : undefined,
        ...style,
      }}
    />
  );
}
