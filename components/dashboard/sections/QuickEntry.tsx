import { createTransaction } from "@/app/actions/transactions";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { listHiddenAccounts } from "@/lib/data/queries";
import { transferTargets } from "@/lib/data/transfer-targets";
import { loadActiveAccounts, loadDashboardFlows } from "../data";

/** New movement form. */
export async function QuickEntry() {
  const [{ refs }, { categories, today }, hidden] = await Promise.all([loadActiveAccounts(), loadDashboardFlows(), listHiddenAccounts()]);
  return (
    <TransactionForm
      action={createTransaction}
      accounts={refs}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      transferTargets={transferTargets(hidden)}
      defaults={{ kind: "expense", accountId: refs[0]?.id ?? "", bookedOn: today }}
    />
  );
}
