import { Amount } from "@monetio/ui";
import type { AccountBankBalances } from "@/lib/banking/connections";

/** "Saldo contabile" and "Saldo disponibile" lines on an account card fed by a bank. */
export function BankBalancesNote({ bank }: { bank?: AccountBankBalances }) {
  if (!bank) return null;
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="flex items-center justify-between gap-2">
        <span className="text-ink-muted">Saldo contabile</span>
        <Amount cents={bank.currentCents} tone="neutral" size="sm" />
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="text-ink-muted">Saldo disponibile</span>
        <Amount cents={bank.availableCents} tone="neutral" size="sm" />
      </span>
    </span>
  );
}
