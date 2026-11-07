import "server-only";
import { addDays } from "../domain/dates";
import { type StatementRow, withRunningBalanceToClosing } from "../domain/statement";
import { takePage } from "./params";
import { balanceBefore, listTransactions } from "./queries";
import type { StatementPeriod } from "./statement-period";

/**
 * Newest booked rows of an account for the period (up to `period.limit`), with running balance
 * anchored on the balance after the newest row; `openingCents` only for dated periods.
 */
export async function loadStatementRows(accountId: string, period: StatementPeriod): Promise<{ rows: StatementRow[]; openingCents: number | null; hasMore: boolean }> {
  // One extra row tells whether "Mostra altri" is needed.
  const limit = period.limit + 1;
  if (period.kind === "recent") {
    const { page, hasMore } = takePage(await listTransactions({ accountId, status: "booked", limit }), period.limit);
    if (page.length === 0) return { rows: [], openingCents: null, hasMore };
    // Every row up to the newest date precedes the newest row, so this is the balance right after it.
    const closing = await balanceBefore(accountId, addDays(page[0].bookedOn, 1));
    return { rows: withRunningBalanceToClosing(closing, page), openingCents: null, hasMore };
  }
  const [txns, opening, closing] = await Promise.all([
    listTransactions({ accountId, from: period.from, to: period.to, status: "booked", limit }),
    balanceBefore(accountId, period.from),
    // Balance at the end of the period, i.e. right after its newest row.
    balanceBefore(accountId, addDays(period.to, 1)),
  ]);
  const { page, hasMore } = takePage(txns, period.limit);
  return { rows: withRunningBalanceToClosing(closing, page), openingCents: opening, hasMore };
}
