export * from "./colors";
export * from "./scales";
export * from "./typography";

import { colors } from "./colors";
import { motion, radius, shadows, sizes, spacing, zIndex } from "./scales";

const allNames = new Set<string>([
  ...colors.map((t) => t.name),
  ...[...spacing, ...radius, ...sizes, ...motion, ...zIndex, ...shadows].map((t) => t.name),
]);

/** Returns `var(--name)` for a known token, throwing on unknown names. */
export function tokenVar(name: string): string {
  if (!allNames.has(name)) throw new Error(`Unknown token: ${name}`);
  return `var(--${name})`;
}

/** Categorical chart colors in validated order. Never cycle past six. */
export const chartSeries = [1, 2, 3, 4, 5, 6].map((i) => `var(--mio-chart-${i})`);
