import { EmptyState } from "@monetio/ui";
import { Landmark } from "lucide-react";
import { getContext } from "@/lib/data/context";
import { listAccounts } from "@/lib/data/queries";
import { ImportWizard } from "./ImportWizard";

export async function ImportView() {
  await getContext();
  const accounts = (await listAccounts()).filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }));
  if (!accounts.length) return <EmptyState icon={<Landmark />} title="Nessun conto" description="Crea prima un conto in cui importare i movimenti." />;
  return <ImportWizard accounts={accounts} />;
}
