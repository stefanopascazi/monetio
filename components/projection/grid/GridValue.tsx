import { Amount } from "@monetio/ui";
import type { GridCell } from "@/lib/data/projection-grid";
import { formatCentsPlain } from "./format";

/** Signed cell total; the current period also says how much is still expected. */
export function GridValue({ cell, current, strong }: { cell: GridCell; current: boolean; strong?: boolean }) {
  if (!cell.totalCents && !cell.bookedCents) return <span className="text-ink-subtle">—</span>;
  const split = current && cell.bookedCents !== 0 && cell.expectedCents !== 0;
  return (
    <span className="flex flex-col items-end leading-tight">
      <Amount cents={cell.totalCents} size="sm" showSign className={strong ? "font-semibold" : undefined} />
      {split && <span className="text-[11px] text-ink-muted">di cui prev. {formatCentsPlain(cell.expectedCents)}</span>}
    </span>
  );
}
