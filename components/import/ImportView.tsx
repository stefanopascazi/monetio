import Link from "next/link";
import { EmptyState, PageHeader } from "@monetio/ui";
import { Landmark } from "lucide-react";
import { listAccounts } from "@/lib/data/queries";
import { ImportWizard } from "./ImportWizard";

export async function ImportView() {
  const accounts = (await listAccounts()).filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }));
  return (
    <>
      <PageHeader
        title="Importa movimenti"
        description="Carica l'estratto conto della banca: i movimenti già presenti vengono riconosciuti e saltati."
        actions={
          <Link href="/movimenti" className="text-sm font-semibold text-brand-ink">
            Torna ai movimenti
          </Link>
        }
      />
      {accounts.length ? <ImportWizard accounts={accounts} /> : <EmptyState icon={<Landmark />} title="Nessun conto" description="Crea prima un conto in cui importare i movimenti." />}
    </>
  );
}
