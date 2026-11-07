import Link from "next/link";
import { Amount, Card, PageHeader } from "@monetio/ui";
import { createTransaction } from "@/app/actions/transactions";
import { PeriodNav } from "@/components/common/PeriodNav";
import { getContext } from "@/lib/data/context";
import { monthParam, PAGE_STEP, pageSizeParam, stringParam, withQuery } from "@/lib/data/params";
import { listAccounts, listCategories, listTransactions, transactionTotals } from "@/lib/data/queries";
import { toTxnView } from "@/lib/data/views";
import { addMonthsToKey, endOfMonth, monthKey, monthLabel, startOfMonth, todayISO } from "@/lib/domain/dates";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";

type SP = Record<string, string | string[] | undefined>;

export async function TransactionsView({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayISO();
  const month = monthParam(sp.mese, monthKey(today));
  const accountId = stringParam(sp.conto);
  const categoryId = stringParam(sp.categoria);
  const q = stringParam(sp.q);
  const limit = pageSizeParam(sp.n);
  const filter = { from: startOfMonth(month), to: endOfMonth(month), accountId, categoryId, search: q };

  // One extra row tells whether there is more to show; totals cover the whole month.
  const [{ members }, accounts, categories, rows, totals] = await Promise.all([
    getContext(),
    listAccounts(),
    listCategories(),
    listTransactions({ ...filter, limit: limit + 1 }),
    transactionTotals(filter),
  ]);
  const txns = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const refs = accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }));
  const catRefs = categories.map((c) => ({ id: c.id, name: c.name }));
  const nav = (m: string) => withQuery("/movimenti", { mese: m, conto: accountId, categoria: categoryId, q });

  return (
    <>
      <PageHeader title="Movimenti" description="Tutti i movimenti dei conti che vedi, mese per mese." />
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* Sticky side column scrolls on its own when taller than the viewport (open form). */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[22px]">
          <TransactionForm action={createTransaction} accounts={refs} categories={catRefs} defaults={{ kind: "expense", accountId: accountId ?? refs[0]?.id ?? "", bookedOn: today }} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-[22px] bg-brand-soft p-4">
              <span className="text-sm text-ink-muted">Entrate</span>
              <Amount cents={totals.incomeCents} tone="income" size="lg" showSign />
            </div>
            <div className="flex flex-col gap-1 rounded-[22px] bg-accent-soft p-4">
              <span className="text-sm text-ink-muted">Uscite</span>
              <Amount cents={-totals.expenseCents} tone="expense" size="lg" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <TransactionFilters month={month} accountId={accountId} categoryId={categoryId} q={q} accounts={refs} categories={catRefs} />
          <Card
            title={`${totals.count} movimenti`}
            subtitle="Giroconti e rettifiche esclusi dai totali"
            action={<PeriodNav label={monthLabel(month, true)} prevHref={nav(addMonthsToKey(month, -1))} nextHref={nav(addMonthsToKey(month, 1))} />}
            padding="none"
          >
            <TransactionList items={txns.map((t) => toTxnView(t, accounts, categories, members))} accounts={refs} categories={catRefs} emptyTitle={`Nessun movimento a ${monthLabel(month, true)}`} />
            {hasMore && (
              <div className="flex justify-center border-t border-border p-4">
                <Link
                  href={withQuery("/movimenti", { mese: month, conto: accountId, categoria: categoryId, q, n: limit + PAGE_STEP })}
                  scroll={false}
                  className="rounded-full bg-surface-sunken px-5 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-soft"
                >
                  Mostra altri ({totals.count - txns.length})
                </Link>
              </div>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
