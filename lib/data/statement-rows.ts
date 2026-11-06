import "server-only";
import { addDays } from "../domain/dates";
import { type StatementRow, withRunningBalance, withRunningBalanceToClosing } from "../domain/statement";
import { balanceBefore, listTransactions } from "./queries";
import type { StatementPeriod } from "./statement-period";

/** Safety cap for filtered periods. */
const PERIOD_LIMIT = 1000;

/** Booked rows of an account for the period, with running balance; `openingCents` only for dated periods. */
export async function loadStatementRows(accountId: string, period: StatementPeriod): Promise<{ rows: StatementRow[]; openingCents: number | null }> {
  if (period.kind === "recent") {
    const txns = await listTransactions({ accountId, status: "booked", limit: period.limit });
    if (txns.length === 0) return { rows: [], openingCents: null };
    // Every row up to the newest date precedes the newest row, so this is the balance right after it.
    const closing = await balanceBefore(accountId, addDays(txns[0].bookedOn, 1));
    return { rows: withRunningBalanceToClosing(closing, txns), openingCents: null };
  }
  const [txns, opening] = await Promise.all([
    listTransactions({ accountId, from: period.from, to: period.to, status: "booked", limit: PERIOD_LIMIT }),
    balanceBefore(accountId, period.from),
  ]);
  return { rows: withRunningBalance(opening, txns), openingCents: opening };
}
