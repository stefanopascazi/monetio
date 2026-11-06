import { notFound } from "next/navigation";
import { Amount, Card, PageHeader, ProjectionChart } from "@monetio/ui";
import { createTransaction } from "@/app/actions/transactions";
import { AccountSettings } from "@/components/accounts/AccountSettings";
import { PeriodNav } from "@/components/common/PeriodNav";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { ensureSynced, loadPendingTransfers } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { PendingTransfersNote } from "@/components/accounts/PendingTransfersNote";
import { withQuery, yearParam } from "@/lib/data/params";
import { balanceBefore, listAccounts, listCategories, listMonthlyBalances, listTransactions } from "@/lib/data/queries";
import { toTxnView } from "@/lib/data/views";
import { monthLabel, todayISO } from "@/lib/domain/dates";
import { groupByMonthDesc, withRunningBalance } from "@/lib/domain/statement";

export async function StatementView({ id, searchParams }: { id: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await ensureSynced();
  const sp = await searchParams;
  const today = todayISO();
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  const firstYear = Number(account.openingDate.slice(0, 4));
  const thisYear = Number(today.slice(0, 4));
  const year = yearParam(sp.anno, thisYear, firstYear, thisYear + 1);
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [{ members }, categories, txns, opening, monthly, planned, pending] = await Promise.all([
    getContext(),
    listCategories(),
    listTransactions({ accountId: id, from, to, status: "booked", limit: 1000 }),
    balanceBefore(id, from),
    listMonthlyBalances(`${year}-01-01`),
    listTransactions({ accountId: id, status: "planned", limit: 200 }),
    loadPendingTransfers(),
  ]);
  const rows = withRunningBalance(opening, txns);
  const groups = groupByMonthDesc(rows);
  const views = new Map(rows.map((r) => [r.id, toTxnView(r, accounts, categories, members)]));
  const refs = accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }));
  const catRefs = categories.map((c) => ({ id: c.id, name: c.name }));
  const history = monthly.filter((m) => m.accountId === id && m.month <= `${year}-12`).map((m) => ({ label: monthLabel(m.month).split(" ")[0], valueCents: m.balanceCents }));
  const owner = ctx.members.find((m) => m.id === account.ownerMemberId);

  return (
    <>
      <PageHeader
        eyebrow={account.visibility === "shared" ? "Conto condiviso" : `Conto privato di ${owner?.displayName ?? "un membro"}`}
        title={account.name}
        description={account.institution ?? undefined}
        actions={
          <span className="flex flex-col items-end gap-2">
            <Amount cents={account.balanceCents} tone="neutral" size="xl" />
            <PendingTransfersNote pending={pending[id]} />
          </span>
        }
      />
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <TransactionForm action={createTransaction} accounts={refs} categories={catRefs} defaults={{ kind: "expense", accountId: id, bookedOn: today }} />
          {history.length > 1 && (
            <Card title="Andamento saldo" subtitle={`Fine mese, ${year}`} collapsible>
              <ProjectionChart data={history} title={`Saldo ${account.name}`} />
            </Card>
          )}
          {planned.length > 0 && (
            <Card title="Pianificati" subtitle="Non ancora avvenuti" padding="none">
              <TransactionList items={planned.map((t) => toTxnView(t, accounts, categories, members))} accounts={refs} categories={catRefs} showAccount={false} />
            </Card>
          )}
          <AccountSettings account={account} canMakePrivate={!account.ownerMemberId || account.ownerMemberId === ctx.me.id} />
        </div>
        <Card
          title="Estratto conto"
          subtitle={`Saldo a inizio ${year}: ${new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(opening / 100)}`}
          action={
            <PeriodNav
              label={String(year)}
              prevHref={year > firstYear ? withQuery(`/conti/${id}`, { anno: year - 1 }) : null}
              nextHref={year < thisYear ? withQuery(`/conti/${id}`, { anno: year + 1 }) : null}
            />
          }
          padding="none"
        >
          {groups.length === 0 ? (
            <TransactionList items={[]} accounts={refs} categories={catRefs} emptyTitle={`Nessun movimento nel ${year}`} />
          ) : (
            groups.map((g) => {
              const last = g.rows[0];
              return (
                <section key={g.month} aria-label={monthLabel(g.month, true)}>
                  <h3 className="flex items-center justify-between bg-surface-sunken px-5 py-2 text-sm font-semibold capitalize text-ink-muted">
                    <span>{monthLabel(g.month, true)}</span>
                    <span>
                      Saldo a fine mese <Amount cents={last.balanceAfterCents} tone="neutral" size="sm" />
                    </span>
                  </h3>
                  <TransactionList items={g.rows.map((r) => views.get(r.id)!)} accounts={refs} categories={catRefs} showAccount={false} showBalance />
                </section>
              );
            })
          )}
        </Card>
      </section>
    </>
  );
}
