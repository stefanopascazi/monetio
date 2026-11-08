import { CalendarCheck } from "lucide-react";
import { Amount, Badge, type BadgeTone, EmptyState } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { MonthRecap, RecapItem } from "@/lib/domain/month-recap";

const SOURCE: Record<RecapItem["source"], { label: string; tone: BadgeTone } | null> = {
  rule: null,
  estimate: { label: "stima", tone: "forecast" },
  contribution: { label: "quota", tone: "transfer" },
  planned: { label: "pianificato", tone: "neutral" },
};

/** Movements still expected this month on one account, with totals in and out. */
export function MonthRecapList({ recap }: { recap: Pick<MonthRecap, "items" | "outCents" | "inCents"> }) {
  if (!recap.items.length) return <EmptyState icon={<CalendarCheck />} title="Tutto fatto" description="Nessun movimento ancora previsto questo mese." />;
  return (
    <>
      <ul className="divide-y divide-[var(--mio-border)]">
        {recap.items.map((x, i) => {
          const src = SOURCE[x.source];
          return (
            <li key={`${x.date}|${x.label}|${i}`} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{x.label}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
                  {x.overdue ? "In ritardo" : dateLabel(x.date)}
                  {src && (
                    <Badge size="sm" tone={src.tone}>
                      {src.label}
                    </Badge>
                  )}
                  {x.overdue && (
                    <Badge size="sm" tone="expense">
                      arretrato
                    </Badge>
                  )}
                </span>
              </span>
              <Amount cents={x.amountCents} size="sm" showSign />
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap justify-end gap-x-4 gap-y-1 border-t border-[var(--mio-border)] px-5 py-3 text-sm text-ink-muted">
        {recap.outCents > 0 && (
          <span className="inline-flex items-center gap-1">
            Uscite <Amount cents={-recap.outCents} tone="expense" size="sm" />
          </span>
        )}
        {recap.inCents > 0 && (
          <span className="inline-flex items-center gap-1">
            Entrate <Amount cents={recap.inCents} tone="income" size="sm" />
          </span>
        )}
      </p>
    </>
  );
}
