import Link from "next/link";
import { Card, EmptyState } from "@monetio/ui";
import { History } from "lucide-react";
import { getContext } from "@/lib/data/context";
import { listImportBatches } from "@/lib/data/import-batches";
import { listAccounts } from "@/lib/data/queries";
import { toBatchView } from "./history-view";
import { ImportBatchList } from "./ImportBatchList";

export async function ImportHistoryView() {
  await getContext();
  const [batches, accounts] = await Promise.all([listImportBatches(), listAccounts()]);
  if (!batches.length) {
    return (
      <Card>
        <EmptyState
          icon={<History />}
          title="Nessun import"
          description="Qui trovi ogni estratto conto importato, con la possibilità di annullarlo."
          action={
            <Link href="/dati/importa" className="text-sm font-semibold text-brand-ink">
              Importa un file
            </Link>
          }
        />
      </Card>
    );
  }
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  return <ImportBatchList items={batches.map((b) => toBatchView(b, names))} />;
}
