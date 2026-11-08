import { Amount, Badge, type BadgeTone, Card } from "@monetio/ui";
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

function Group({ title, period, items, totals, empty }: { title: string; period: string; items: RecapItem[]; totals: RecapTotals; empty: string }) {
  return (
    <Card aria-label={title} title={title} subtitle={`${items.length} ${items.length === 1 ? "movimento" : "movimenti"} · ${period}`} action={<Totals totals={totals} />} padding="none" collapsible>
      {items.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-ink-muted">{empty}</p>
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
    </Card>
  );
}

/** Whole month of one account as two separate cards: still to book first, then booked. */
export function MonthRecapList({ recap, period }: { recap: Pick<MonthRecap, "paid" | "due" | "paidTotals" | "dueTotals">; period: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Group title="Da contabilizzare" period={period} items={recap.due} totals={recap.dueTotals} empty="Nessun movimento da contabilizzare questo mese." />
      <Group title="Contabilizzato" period={period} items={recap.paid} totals={recap.paidTotals} empty="Nessun movimento contabilizzato questo mese." />
    </div>
  );
}
