import Link from "next/link";
import { Card, CashflowChart } from "@monetio/ui";
import { DASHBOARD_MONTHS, loadDashboardFlows } from "../data";

/** Income vs expenses of the last months. */
export async function CashflowCard() {
  const { cashflow } = await loadDashboardFlows();
  return (
    <Card title="Flusso di cassa" subtitle={`Ultimi ${DASHBOARD_MONTHS} mesi, senza giroconti`} action={<Link href="/analisi/statistiche" className="text-sm font-semibold text-brand-ink">Statistiche</Link>}>
      <CashflowChart data={cashflow} />
    </Card>
  );
}
