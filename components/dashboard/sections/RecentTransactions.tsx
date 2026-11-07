import Link from "next/link";
import { Card } from "@monetio/ui";
import { TransactionList } from "@/components/transactions/TransactionList";
import { getContext } from "@/lib/data/context";
import { listTransactions } from "@/lib/data/queries";
import { toTxnView } from "@/lib/data/views";
import { loadActiveAccounts, loadDashboardFlows } from "../data";

/** Last booked movements. */
export async function RecentTransactions() {
  const [ctx, { accounts, refs }, { categories, today }] = await Promise.all([getContext(), loadActiveAccounts(), loadDashboardFlows()]);
  const recent = await listTransactions({ to: today, status: "booked", limit: 8 });
  return (
    <Card title="Ultimi movimenti" action={<Link href="/movimenti" className="text-sm font-semibold text-brand-ink">Vedi tutti</Link>} padding="none">
      <TransactionList
        items={recent.map((t) => toTxnView(t, accounts, categories, ctx.members))}
        accounts={refs}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </Card>
  );
}
