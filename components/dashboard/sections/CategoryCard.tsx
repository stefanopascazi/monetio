import Link from "next/link";
import { Card, CategoryDonut } from "@monetio/ui";
import { donutMonth } from "@/lib/data/dashboard";
import { categorySlices } from "@/lib/data/flows";
import { monthLabel } from "@/lib/domain/dates";
import { loadDashboardFlows } from "../data";

/** Spending by category of the current (or previous) month. */
export async function CategoryCard() {
  const { flows, month, categories } = await loadDashboardFlows();
  const shown = donutMonth(flows, month, categories);
  return (
    <Card title="Spese per categoria" subtitle={monthLabel(shown, true)} action={<Link href="/analisi/statistiche" className="text-sm font-semibold text-brand-ink">Statistiche</Link>}>
      <CategoryDonut data={categorySlices(flows, shown, categories)} />
    </Card>
  );
}
