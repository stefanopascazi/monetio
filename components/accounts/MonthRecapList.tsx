import type { ReactNode } from "react";
import { Amount } from "@monetio/ui";
import { MobileFoldCard } from "@/components/common/MobileFoldCard";
import { addMonthsToKey, monthLabel } from "@/lib/domain/dates";
import type { MonthRecap, RecapItem, RecapTotals } from "@/lib/domain/month-recap";
import { EstimateActions } from "./EstimateActions";
import { EstimateUsageRow } from "./EstimateUsageRow";
import { isUsedUp } from "./recap-source";
import { RecapItemSummary } from "./RecapItemSummary";

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
          {items.map((x) => (
            <li key={x.key} className={x.usage ? "flex flex-col gap-2 px-1 py-1" : "flex flex-col gap-2 px-5 py-3"}>
              {x.usage ? (
                <EstimateUsageRow item={{ ...x, usage: x.usage }} />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <RecapItemSummary item={x} />
                  <Amount cents={x.amountCents} size="sm" showSign />
                </div>
              )}
              {/* Estimates of the current month: book the remainder or drop it (nothing left once used up). */}
              {today && x.ref && !isUsedUp(x) && (
                <div className={x.usage ? "px-4 pb-2" : undefined}>
                  <EstimateActions refKey={x.ref} amountCents={x.amountCents} today={today} />
                </div>
              )}
            </li>
          ))}
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
