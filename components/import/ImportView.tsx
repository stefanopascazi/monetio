import { EmptyState } from "@monetio/ui";
import { Landmark } from "lucide-react";
import { getContext } from "@/lib/data/context";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { ImportWizard } from "./ImportWizard";

export async function ImportView() {
  await getContext();
  const [allAccounts, allCategories] = await Promise.all([listAccounts(), listCategories()]);
  const accounts = allAccounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }));
  const categories = allCategories.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
  if (!accounts.length) return <EmptyState icon={<Landmark />} title="Nessun conto" description="Crea prima un conto in cui importare i movimenti." />;
  return <ImportWizard accounts={accounts} categories={categories} />;
}
