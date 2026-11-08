import type { ReactNode } from "react";
import { Amount, Badge, type BadgeTone } from "@monetio/ui";
import { MobileFoldCard } from "@/components/common/MobileFoldCard";
import { addMonthsToKey, dateLabel, monthLabel } from "@/lib/domain/dates";
import type { MonthRecap, RecapItem, RecapTotals } from "@/lib/domain/month-recap";
import { EstimateActions } from "./EstimateActions";

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

function Group({ title, period, items, totals, empty, today }: { title: string; period: string; items: RecapItem[]; totals: RecapTotals; empty: string; today?: string }) {
  return (
    <MobileFoldCard aria-label={title} title={title} subtitle={`${items.length} ${items.length === 1 ? "movimento" : "movimenti"} · ${period}`} action={<Totals totals={totals} />} padding="none">
      {items.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--mio-border)]">
          {items.map((x) => {
            const src = SOURCE[x.source];
            return (
              <li key={x.key} className="flex flex-col gap-2 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
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
                </div>
                {/* Estimates of the current month: book the remainder or drop it. */}
                {today && x.ref && <EstimateActions refKey={x.ref} amountCents={x.amountCents} today={today} />}
              </li>
            );
          })}
        </ul>
      )}
    </MobileFoldCard>
  );
}

export interface MonthRecapListProps {
  recap: Pick<MonthRecap, "month" | "openingCents" | "closingCents" | "paid" | "due" | "paidTotals" | "dueTotals">;
  /** Today's month: the opening is the current balance and booked rows are always listed. */
  current: boolean;
  /** Month navigation (PeriodNav). */
  nav?: ReactNode;
  /** Today's date: enables closing or booking the current month's estimates. */
  today?: string;
}

const balanceTone = (cents: number) => (cents < 0 ? "expense" : "neutral");

/** Month of one account: balances and navigation, then still to book and booked as separate cards. */
export function MonthRecapList({ recap, current, nav, today }: MonthRecapListProps) {
  const period = monthLabel(recap.month, true);
  const showPaid = current || recap.paid.length > 0;
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Riepilogo del mese" className="flex flex-col gap-3 rounded-[22px] bg-surface px-5 py-4">
        {nav}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-muted">{current ? "Saldo attuale" : `Rimanenza di ${monthLabel(addMonthsToKey(recap.month, -1), true)}`}</dt>
            <dd>
              <Amount cents={recap.openingCents} tone={balanceTone(recap.openingCents)} size="md" />
            </dd>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <dt className="text-ink-muted">Rimanenza a fine mese</dt>
            <dd>
              <Amount cents={recap.closingCents} tone={balanceTone(recap.closingCents)} size="md" />
            </dd>
          </div>
        </dl>
      </section>
      <Group title="Da contabilizzare" period={period} items={recap.due} totals={recap.dueTotals} empty={`Nessun movimento da contabilizzare: ${period}.`} today={current ? today : undefined} />
      {showPaid && <Group title="Contabilizzato" period={period} items={recap.paid} totals={recap.paidTotals} empty={`Nessun movimento contabilizzato: ${period}.`} />}
    </div>
  );
}
