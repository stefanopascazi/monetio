import type { ReactNode } from "react";
import { Amount } from "@monetio/ui";
import { MobileFoldCard } from "@/components/common/MobileFoldCard";
import { addMonthsToKey, monthLabel } from "@/lib/domain/dates";
import type { MonthRecap, RecapItem, RecapTotals } from "@/lib/domain/month-recap";
import { type RecapEditing, RecapRow } from "./RecapRow";

function Totals({ totals }: { totals: RecapTotals }) {
  return (
    <span className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      {totals.outCents > 0 && <Amount cents={-totals.outCents} tone="expense" size="sm" />}
      {totals.inCents > 0 && <Amount cents={totals.inCents} tone="income" size="sm" />}
    </span>
  );
}

function Group({ title, period, items, totals, empty, today, editing }: { title: string; period: string; items: RecapItem[]; totals: RecapTotals; empty: string; today?: string; editing?: RecapEditing }) {
  return (
    <MobileFoldCard aria-label={title} title={title} subtitle={`${items.length} ${items.length === 1 ? "movimento" : "movimenti"} · ${period}`} action={<Totals totals={totals} />} padding="none">
      {items.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--mio-border)]">
          {items.map((x) => (
            <RecapRow key={x.key} item={x} today={today} editing={editing} />
          ))}
        </ul>
      )}
    </MobileFoldCard>
  );
}

export interface MonthRecapListProps {
  recap: Pick<MonthRecap, "month" | "openingCents" | "closingCents" | "due" | "dueTotals">;
  /** Today's month: the opening is the current balance. */
  current: boolean;
  /** Month navigation (PeriodNav). */
  nav?: ReactNode;
  /** Today's date: enables closing or booking the current month's estimates. */
  today?: string;
  /** Planned movements and refs, to edit or delete them from their row. */
  editing?: RecapEditing;
}

const balanceTone = (cents: number) => (cents < 0 ? "expense" : "neutral");

/** Month of one account: balances and navigation, then what is still to book (booked rows live in the statement). */
export function MonthRecapList({ recap, current, nav, today, editing }: MonthRecapListProps) {
  const period = monthLabel(recap.month, true);
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
      <Group title="Da contabilizzare" period={period} items={recap.due} totals={recap.dueTotals} empty={`Nessun movimento da contabilizzare: ${period}.`} today={current ? today : undefined} editing={editing} />
    </div>
  );
}
