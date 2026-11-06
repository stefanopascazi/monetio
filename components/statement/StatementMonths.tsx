import { Amount } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { TxnView } from "@/lib/data/views";
import { monthLabel } from "@/lib/domain/dates";
import { groupByMonthDesc, type StatementRow } from "@/lib/domain/statement";

/** Statement rows grouped by month, newest first, with the end-of-month balance. */
export function StatementMonths({ rows, views, accounts, categories, emptyTitle }: {
  rows: StatementRow[];
  views: Map<string, TxnView>;
  accounts: NamedRef[];
  categories: NamedRef[];
  emptyTitle: string;
}) {
  const groups = groupByMonthDesc(rows);
  if (groups.length === 0) return <TransactionList items={[]} accounts={accounts} categories={categories} emptyTitle={emptyTitle} />;
  return groups.map((g) => (
    <section key={g.month} aria-label={monthLabel(g.month, true)}>
      <h3 className="flex items-center justify-between bg-surface-sunken px-5 py-2 text-sm font-semibold capitalize text-ink-muted">
        <span>{monthLabel(g.month, true)}</span>
        <span>
          Saldo a fine mese <Amount cents={g.rows[0].balanceAfterCents} tone="neutral" size="sm" />
        </span>
      </h3>
      <TransactionList items={g.rows.map((r) => views.get(r.id)!)} accounts={accounts} categories={categories} showAccount={false} showBalance />
    </section>
  ));
}
