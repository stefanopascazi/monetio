import { getContext } from "@/lib/data/context";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { ActiveHouseholdCard } from "./ActiveHouseholdCard";
import { ArchivedAccounts } from "./ArchivedAccounts";
import { HouseholdsCard } from "./HouseholdsCard";
import { CategoryManager } from "./SettingsForms";

/** Impostazioni > Nucleo: households, the active one with its people, and its shared data (categories, archived accounts). */
export async function HouseholdSettingsView() {
  const ctx = await getContext();
  const [categories, accounts] = await Promise.all([listCategories(), listAccounts()]);
  const archived = accounts.filter((a) => a.archived).map(({ id, name, institution, balanceCents }) => ({ id, name, institution, balanceCents }));
  return (
    <>
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <ActiveHouseholdCard householdName={ctx.householdName} inviteCode={ctx.inviteCode} me={ctx.me} members={ctx.members} />
        <HouseholdsCard memberships={ctx.memberships} activeId={ctx.householdId} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Categorie</h2>
        <CategoryManager categories={categories} />
      </section>
      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Conti archiviati</h2>
          <ArchivedAccounts accounts={archived} />
        </section>
      )}
    </>
  );
}
