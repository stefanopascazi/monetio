import { AccountGrid } from "@/components/accounts/AccountGrid";
import { loadPendingTransfers } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { loadActiveAccounts } from "../data";

/** Account cards with the transfers still pending this month. */
export async function AccountsSection() {
  const [ctx, { active }, pending] = await Promise.all([getContext(), loadActiveAccounts(), loadPendingTransfers()]);
  return <AccountGrid accounts={active} members={ctx.members} pending={pending} />;
}
