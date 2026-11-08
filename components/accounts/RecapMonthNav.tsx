import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { PeriodNav } from "@/components/common/PeriodNav";

export interface RecapMonthNavProps {
  label: string;
  prevHref: string | null;
  nextHref: string | null;
  /** Back to the current month; null when already there. */
  resetHref: string | null;
}

/** Month arrows of the account recap, with a reset link while browsing projected months. */
export function RecapMonthNav({ label, prevHref, nextHref, resetHref }: RecapMonthNavProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <PeriodNav label={label} prevHref={prevHref} nextHref={nextHref} />
      {resetHref && (
        <Link href={resetHref} className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-2 text-sm font-semibold text-ink hover:bg-brand-soft">
          <RotateCcw className="size-4" aria-hidden="true" />
          Mese corrente
        </Link>
      )}
    </div>
  );
}
