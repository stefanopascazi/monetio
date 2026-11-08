import { Card } from "@monetio/ui";
import { MonthRecapList } from "@/components/accounts/MonthRecapList";
import { loadAccountMonthRecap } from "@/lib/data/agenda";
import { monthLabel, monthKey } from "@/lib/domain/dates";

/** This month on the account: what is still due and what is already paid. */
export async function MonthRecapCard({ accountId, balanceCents, today }: { accountId: string; balanceCents: number; today: string }) {
  const recap = await loadAccountMonthRecap(accountId, balanceCents);
  return (
    <Card title="Movimenti del mese" subtitle={`Pagati e da pagare, ${monthLabel(monthKey(today), true)}`} padding="none" collapsible>
      <MonthRecapList recap={recap} />
    </Card>
  );
}
