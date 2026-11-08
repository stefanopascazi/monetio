import { AccountGrid } from "@/components/accounts/AccountGrid";
import { loadMonthEndBalances } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { loadActiveAccounts } from "../data";

/** Account cards with the expected month-end balance. */
export async function AccountsSection() {
  const [ctx, { active }, monthEnd] = await Promise.all([getContext(), loadActiveAccounts(), loadMonthEndBalances()]);
  return <AccountGrid accounts={active} members={ctx.members} monthEnd={monthEnd} />;
}
