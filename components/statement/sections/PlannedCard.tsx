import { MobileFoldCard } from "@/components/common/MobileFoldCard";
import { TransactionList } from "@/components/transactions/TransactionList";
import { listTransactions } from "@/lib/data/queries";
import { toTxnView } from "@/lib/data/views";
import { loadStatementRefs } from "../data";

/** Planned movements of the account not yet happened. */
export async function PlannedCard({ accountId }: { accountId: string }) {
  const [{ accounts, categories, members, refs, catRefs }, planned] = await Promise.all([
    loadStatementRefs(),
    listTransactions({ accountId, status: "planned", limit: 200 }),
  ]);
  if (!planned.length) return null;
  return (
    <MobileFoldCard title="Pianificati" subtitle="Non ancora avvenuti" padding="none">
      <TransactionList items={planned.map((t) => toTxnView(t, accounts, categories, members))} accounts={refs} categories={catRefs} showAccount={false} />
    </MobileFoldCard>
  );
}
