import { Card, CashflowChart, StatTile } from "@monetio/ui";
import { monthLabel } from "@/lib/domain/dates";
import { CategoryComparisonList } from "./CategoryComparisonList";
import { loadStatistics } from "./data";
import { FixedVariableCard } from "./FixedVariableCard";
import { TopMerchantsList } from "./TopMerchantsList";

/** Booked figures of the selected account and period. */
export async function StatisticsContent({ accountId, months }: { accountId: string | null; months: number }) {
  const s = await loadStatistics(accountId, months);
  const range = `${monthLabel(s.period[0])} – ${monthLabel(s.period[s.period.length - 1])}`;
  return (
    <>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile tone="mint" label="Entrate" valueCents={s.totals.incomeCents} />
        <StatTile tone="coral" label="Uscite" valueCents={s.totals.expenseCents} />
        <StatTile label={s.totals.savedCents >= 0 ? "Messo da parte" : "Speso oltre le entrate"} valueCents={Math.abs(s.totals.savedCents)} />
        <StatTile label="Uscite medie al mese" valueCents={s.totals.avgMonthlyExpenseCents} />
      </section>
      <Card title="Entrate e uscite" subtitle={`${range}, mesi completi, senza giroconti`}>
        <CashflowChart data={s.cashflow} />
      </Card>
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <CategoryComparisonList rows={s.categories} monthLabel={monthLabel(s.month, true)} baseMonths={months} />
        <div className="flex flex-col gap-4">
          <TopMerchantsList merchants={s.merchants} />
          <FixedVariableCard {...s.split} />
        </div>
      </section>
    </>
  );
}
