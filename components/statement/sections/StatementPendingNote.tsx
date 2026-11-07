import { PendingTransfersNote } from "@/components/accounts/PendingTransfersNote";
import { loadPendingTransfers } from "@/lib/data/agenda";

/** Transfers still due this month; streams after the header (needs the agenda). */
export async function StatementPendingNote({ accountId }: { accountId: string }) {
  const pending = await loadPendingTransfers();
  return <PendingTransfersNote pending={pending[accountId]} />;
}
