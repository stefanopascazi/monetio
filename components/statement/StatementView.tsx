import { notFound } from "next/navigation";
import { Card, ProjectionChart } from "@monetio/ui";
import { createTransaction } from "@/app/actions/transactions";
import { AccountHeader } from "@/components/accounts/AccountHeader";
import { AccountSettings } from "@/components/accounts/AccountSettings";
import { PendingTransfersNote } from "@/components/accounts/PendingTransfersNote";
import { PeriodNav } from "@/components/common/PeriodNav";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { ensureSynced, loadPendingTransfers } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { withQuery } from "@/lib/data/params";
import { listAccounts, listCategories, listMonthlyBalances, listTransactions } from "@/lib/data/queries";
import { adjacentMonths, periodLabel, statementPeriod } from "@/lib/data/statement-period";
import { loadStatementRows } from "@/lib/data/statement-rows";
import { toTxnView } from "@/lib/data/views";
import { monthKey, monthLabel, todayISO } from "@/lib/domain/dates";
import { StatementFilters } from "./StatementFilters";
import { StatementMonths } from "./StatementMonths";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export async function StatementView({ id, searchParams }: { id: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await ensureSynced();
  const sp = await searchParams;
  const today = todayISO();
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  const basePath = `/conti/${id}`;
  const period = statementPeriod(sp, today, account.openingDate);
  // Chart year follows the selected period; the latest rows show the current year.
  const year = Number((period.kind === "recent" ? today : period.to).slice(0, 4));
  const [{ members }, categories, { rows, openingCents }, monthly, planned, pending] = await Promise.all([
    getContext(),
    listCategories(),
    loadStatementRows(id, period),
    listMonthlyBalances(`${year}-01-01`),
    listTransactions({ accountId: id, status: "planned", limit: 200 }),
    loadPendingTransfers(),
  ]);
  const views = new Map(rows.map((r) => [r.id, toTxnView(r, accounts, categories, members)]));
  const refs = accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }));
  const catRefs = categories.map((c) => ({ id: c.id, name: c.name }));
  const history = monthly.filter((m) => m.accountId === id && m.month <= `${year}-12`).map((m) => ({ label: monthLabel(m.month).split(" ")[0], valueCents: m.balanceCents }));
  const owner = ctx.members.find((m) => m.id === account.ownerMemberId);
  const label = periodLabel(period);
  const nav = period.kind === "month" ? adjacentMonths(period.month, monthKey(account.openingDate), monthKey(today)) : null;

  return (
    <>
      <AccountHeader
        name={account.name}
        context={account.visibility === "shared" ? "Conto condiviso" : `Conto privato di ${owner?.displayName ?? "un membro"}`}
        institution={account.institution}
        balanceCents={account.balanceCents}
        settings={<AccountSettings account={account} canMakePrivate={!account.ownerMemberId || account.ownerMemberId === ctx.me.id} />}
        note={<PendingTransfersNote pending={pending[id]} />}
      />
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
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
        </div>
        <Card
          title="Estratto conto"
          subtitle={openingCents === null ? label : `${label} · saldo iniziale ${eur.format(openingCents / 100)}`}
          action={
            nav && (
              <PeriodNav
                label={label}
                prevHref={nav.prev ? withQuery(basePath, { mese: nav.prev }) : null}
                nextHref={nav.next ? withQuery(basePath, { mese: nav.next }) : null}
              />
            )
          }
          padding="none"
        >
          <StatementFilters basePath={basePath} period={period} />
          <StatementMonths rows={rows} views={views} accounts={refs} categories={catRefs} emptyTitle={period.kind === "recent" ? "Nessun movimento" : `Nessun movimento: ${label.toLowerCase()}`} />
        </Card>
      </section>
    </>
  );
}
