import { categoryRefs } from "@/components/common/options";
import { getContext } from "@/lib/data/context";
import { listAccounts, listCategories, listHiddenAccounts } from "@/lib/data/queries";
import { transferTargets } from "@/lib/data/transfer-targets";
import { todayISO } from "@/lib/domain/dates";
import { QuickCreate } from "./QuickCreate";

/** Loads the refs the quick-create forms need; rendered in the top bar inside Suspense. */
export async function QuickCreateSection() {
  await getContext();
  const [accounts, categories, hidden] = await Promise.all([listAccounts(), listCategories(), listHiddenAccounts()]);
  const refs = accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }));
  return <QuickCreate accounts={refs} categories={categoryRefs(categories)} transferTargets={transferTargets(hidden)} today={todayISO()} />;
}
