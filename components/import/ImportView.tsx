import { EmptyState } from "@monetio/ui";
import { Landmark } from "lucide-react";
import { getContext } from "@/lib/data/context";
import { stringParam } from "@/lib/data/params";
import { listAccounts } from "@/lib/data/queries";
import { ImportWizard } from "./ImportWizard";

type SP = Record<string, string | string[] | undefined>;

export async function ImportView({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp] = await Promise.all([searchParams, getContext()]);
  const accounts = (await listAccounts()).filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }));
  if (!accounts.length) return <EmptyState icon={<Landmark />} title="Nessun conto" description="Crea prima un conto in cui importare i movimenti." />;
  // ?conto= comes from the account page: preselect it when visible.
  const wanted = stringParam(sp.conto);
  const initial = accounts.find((a) => a.value === wanted)?.value ?? accounts[0].value;
  return <ImportWizard accounts={accounts} initialAccountId={initial} />;
}
