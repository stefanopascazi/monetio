import { StatTile } from "@monetio/ui";
import { monthOverMonth } from "@/lib/data/dashboard";
import { loadDashboardFlows } from "../data";

/** Income and expenses of the month compared with the previous one. */
export async function MonthStats() {
  const { cashflow } = await loadDashboardFlows();
  const m = monthOverMonth(cashflow);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
      <StatTile tone="mint" label="Entrate del mese" valueCents={m.incomeCents} delta={m.incomeDelta} deltaLabel="vs mese scorso" />
      <StatTile tone="coral" label="Uscite del mese" valueCents={m.expenseCents} delta={m.expenseDelta} deltaLabel="vs mese scorso" upIsGood={false} />
    </div>
  );
}
