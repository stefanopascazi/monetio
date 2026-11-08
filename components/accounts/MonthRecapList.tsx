import { Amount, Badge, type BadgeTone } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { MonthRecap, RecapItem, RecapTotals } from "@/lib/domain/month-recap";

const SOURCE: Record<RecapItem["source"], { label: string; tone: BadgeTone } | null> = {
  booked: null,
  rule: null,
  estimate: { label: "stima", tone: "forecast" },
  contribution: { label: "quota", tone: "transfer" },
  planned: { label: "pianificato", tone: "neutral" },
};

function Totals({ totals }: { totals: RecapTotals }) {
  return (
    <span className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      {totals.outCents > 0 && <Amount cents={-totals.outCents} tone="expense" size="sm" />}
      {totals.inCents > 0 && <Amount cents={totals.inCents} tone="income" size="sm" />}
    </span>
  );
}

function Group({ title, items, totals, empty }: { title: string; items: RecapItem[]; totals: RecapTotals; empty: string }) {
  return (
    <section aria-label={title}>
      <h3 className="flex items-center justify-between gap-3 bg-surface px-5 py-2 text-sm font-semibold text-ink">
        <span>
          {title} <span className="font-normal text-ink-muted">· {items.length}</span>
        </span>
        <Totals totals={totals} />
      </h3>
      {items.length === 0 ? (
        <p className="px-5 py-3 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--mio-border)]">
          {items.map((x) => {
            const src = SOURCE[x.source];
            return (
              <li key={x.key} className="flex items-center justify-between gap-3 px-5 py-3">
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
      )}
    </section>
  );
}

/** Whole month of one account: still due first, then already paid. */
export function MonthRecapList({ recap }: { recap: Pick<MonthRecap, "paid" | "due" | "paidTotals" | "dueTotals"> }) {
  return (
    <div className="flex flex-col">
      <Group title="Da pagare" items={recap.due} totals={recap.dueTotals} empty="Nessun movimento ancora previsto questo mese." />
      <Group title="Pagato" items={recap.paid} totals={recap.paidTotals} empty="Nessun movimento registrato questo mese." />
    </div>
  );
}
