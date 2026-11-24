import { AccountGrid } from "@/components/accounts/AccountGrid";
import { loadMonthEndBalances } from "@/lib/data/agenda";
import { loadBankBalances } from "@/lib/data/bank-balances";
import { getContext } from "@/lib/data/context";
import { loadActiveAccounts } from "../data";

/** Account cards with the expected month-end balance and, for linked ones, the bank's balances. */
export async function AccountsSection() {
  const [ctx, { active }, monthEnd, bank] = await Promise.all([getContext(), loadActiveAccounts(), loadMonthEndBalances(), loadBankBalances()]);
  return <AccountGrid accounts={active} members={ctx.members} monthEnd={monthEnd} bank={bank} />;
}
