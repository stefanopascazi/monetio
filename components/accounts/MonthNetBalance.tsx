import { Amount } from "@monetio/ui";
import type { MonthRecap } from "@/lib/domain/month-recap";

/** Expected month-end balance under the account balance (still to book movements included). */
export function MonthNetBalance({ recap }: { recap: Pick<MonthRecap, "closingCents"> }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-ink-muted">Rimanenza a fine mese</span>
      <Amount cents={recap.closingCents} tone={recap.closingCents < 0 ? "expense" : "neutral"} size="sm" />
    </span>
  );
}
