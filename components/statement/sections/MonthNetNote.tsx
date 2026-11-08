import { MonthNetBalance } from "@/components/accounts/MonthNetBalance";
import { loadAccountMonthRecap } from "@/lib/data/agenda";

/** Net balances under the header; streams after it (needs the projection). */
export async function MonthNetNote({ accountId, balanceCents }: { accountId: string; balanceCents: number }) {
  return <MonthNetBalance recap={await loadAccountMonthRecap(accountId, balanceCents)} />;
}
