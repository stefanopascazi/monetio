import { Card } from "@monetio/ui";
import { MonthRecapList } from "@/components/accounts/MonthRecapList";
import { loadAccountMonthRecap } from "@/lib/data/agenda";
import { monthLabel, monthKey } from "@/lib/domain/dates";

/** Recap of what is still to pay or receive this month on the account. */
export async function MonthRecapCard({ accountId, balanceCents, today }: { accountId: string; balanceCents: number; today: string }) {
  const recap = await loadAccountMonthRecap(accountId, balanceCents);
  return (
    <Card title="Da sostenere questo mese" subtitle={`Movimenti previsti fino a fine ${monthLabel(monthKey(today), true)}`} padding="none" collapsible>
      <MonthRecapList recap={recap} />
    </Card>
  );
}
