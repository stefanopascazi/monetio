import { Amount } from "@monetio/ui";
import type { MonthRecap } from "@/lib/domain/month-recap";

const tone = (cents: number) => (cents < 0 ? "expense" : "neutral");

/** Balances under the account balance: after this month's remaining outflows, and at month end. */
export function MonthNetBalance({ recap }: { recap: Pick<MonthRecap, "dueTotals" | "afterOutCents" | "closingCents"> }) {
  const { outCents, inCents } = recap.dueTotals;
  if (!outCents && !inCents) return null;
  return (
    <dl className="flex flex-col items-end gap-1 text-sm">
      {outCents > 0 && (
        <div className="flex items-center gap-2">
          <dt className="text-ink-muted">Al netto delle uscite del mese</dt>
          <dd>
            <Amount cents={recap.afterOutCents} tone={tone(recap.afterOutCents)} size="sm" />
          </dd>
        </div>
      )}
      <div className="flex items-center gap-2">
        <dt className="text-ink-muted">Rimanenza a fine mese</dt>
        <dd>
          <Amount cents={recap.closingCents} tone={tone(recap.closingCents)} size="sm" />
        </dd>
      </div>
    </dl>
  );
}
