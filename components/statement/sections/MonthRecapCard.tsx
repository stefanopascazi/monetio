import { MonthRecapList } from "@/components/accounts/MonthRecapList";
import { loadAccountMonthRecap } from "@/lib/data/agenda";
import { monthLabel, monthKey } from "@/lib/domain/dates";

/** This month on the account: what is still to book and what is already booked. */
export async function MonthRecapCard({ accountId, balanceCents, today }: { accountId: string; balanceCents: number; today: string }) {
  const recap = await loadAccountMonthRecap(accountId, balanceCents);
  return <MonthRecapList recap={recap} period={monthLabel(monthKey(today), true)} />;
}
