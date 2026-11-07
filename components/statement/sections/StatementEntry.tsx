import { createTransaction } from "@/app/actions/transactions";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { listHiddenAccounts } from "@/lib/data/queries";
import { transferTargets } from "@/lib/data/transfer-targets";
import { loadStatementRefs } from "../data";

/** New movement form preset on this account. */
export async function StatementEntry({ accountId, today }: { accountId: string; today: string }) {
  const [{ refs, catRefs }, hidden] = await Promise.all([loadStatementRefs(), listHiddenAccounts()]);
  return (
    <TransactionForm
      action={createTransaction}
      accounts={refs}
      categories={catRefs}
      transferTargets={transferTargets(hidden)}
      defaults={{ kind: "expense", accountId, bookedOn: today }}
    />
  );
}
