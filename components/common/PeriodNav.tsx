import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/** Previous/next links around a period label; hrefs are built by the caller. */
export function PeriodNav({ label, prevHref, nextHref }: { label: string; prevHref: string | null; nextHref: string | null }) {
  const cls = "inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink hover:bg-surface-raised";
  return (
    <nav aria-label="Periodo" className="flex items-center gap-3">
      {prevHref ? (
        <Link href={prevHref} className={cls} aria-label="Periodo precedente">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${cls} opacity-40`} aria-hidden="true">
          <ChevronLeft className="size-5" />
        </span>
      )}
      <span className="min-w-36 text-center font-display text-lg font-bold capitalize">{label}</span>
      {nextHref ? (
        <Link href={nextHref} className={cls} aria-label="Periodo successivo">
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${cls} opacity-40`} aria-hidden="true">
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  );
}
