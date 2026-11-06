import Link from "next/link";
import { Amount, Card, CashflowChart, CategoryDonut, StatTile } from "@monetio/ui";
import { AccountGrid } from "@/components/accounts/AccountGrid";
import { DueList } from "@/components/due/DueList";
import { ProjectionPanel } from "@/components/projection/ProjectionPanel";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { createTransaction } from "@/app/actions/transactions";
import { loadAgenda, loadPendingTransfers, loadProjection } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { cashflowSeries, categorySlices } from "@/lib/data/flows";
import { lastMonths, projectionPoints } from "@/lib/data/history";
import { dueViews } from "@/lib/data/page-views";
import { listAccounts, listCategories, listFlows, listTransactions } from "@/lib/data/queries";
import { toTxnView } from "@/lib/data/views";
import { addMonthsToKey, monthKey, monthLabel, startOfMonth } from "@/lib/domain/dates";

export async function Dashboard() {
  const ctx = await getContext();
  const agenda = await loadAgenda();
  const today = agenda.today;
  const month = monthKey(today);
  const months = lastMonths(month, 6);
  const [accounts, categories, flows, recent, { projection }, pending] = await Promise.all([
    listAccounts(),
    listCategories(),
    listFlows(startOfMonth(months[0])),
    listTransactions({ to: today, status: "booked", limit: 8 }),
    loadProjection(12),
    loadPendingTransfers(),
  ]);
  const active = accounts.filter((a) => !a.archived);
  const total = active.reduce((s, a) => s + a.balanceCents, 0);
  const cashflow = cashflowSeries(flows, months);
  const now = cashflow.at(-1)!;
  const prev = cashflow.at(-2)!;
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : undefined);
  const slicesMonth = categorySlices(flows, month, categories).length ? month : addMonthsToKey(month, -1);
  const refs = active.map((a) => ({ id: a.id, name: a.name }));
  const catRefs = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-surface p-6">
          <p className="text-ink-muted">
            Ciao {ctx.me.displayName}, ecco la situazione di {monthLabel(month, true)}.
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-muted">Saldo dei conti che vedi</span>
            <Amount cents={total} tone="neutral" size="xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <StatTile tone="mint" label="Entrate del mese" valueCents={now.incomeCents} delta={pct(now.incomeCents, prev.incomeCents)} deltaLabel="vs mese scorso" />
          <StatTile tone="coral" label="Uscite del mese" valueCents={now.expenseCents} delta={pct(now.expenseCents, prev.expenseCents)} deltaLabel="vs mese scorso" upIsGood={false} />
        </div>
      </section>

      <AccountGrid accounts={active} members={ctx.members} pending={pending} />

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <TransactionForm action={createTransaction} accounts={refs} categories={catRefs} defaults={{ kind: "expense", accountId: refs[0]?.id ?? "", bookedOn: today }} />
        <DueList items={dueViews(agenda.due, agenda.rules, active).slice(0, 6)} today={today} title="In scadenza" subtitle="Prossimi 31 giorni" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Flusso di cassa" subtitle="Ultimi 6 mesi, senza giroconti">
          <CashflowChart data={cashflow} />
        </Card>
        <ProjectionPanel
          title="Dove stiamo andando"
          subtitle="Prossimi 12 mesi da ricorrenze e quote"
          series={[{ id: "all", name: "tutti i conti", points: projectionPoints([], projection, (p) => p.totalCents) }]}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card title="Spese per categoria" subtitle={monthLabel(slicesMonth, true)}>
          <CategoryDonut data={categorySlices(flows, slicesMonth, categories)} />
        </Card>
        <Card title="Ultimi movimenti" action={<Link href="/movimenti" className="text-sm font-semibold text-brand-ink">Vedi tutti</Link>} padding="none">
          <TransactionList items={recent.map((t) => toTxnView(t, accounts, categories, ctx.members))} accounts={refs} categories={catRefs} />
        </Card>
      </section>
    </>
  );
}
