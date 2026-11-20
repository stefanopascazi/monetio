import { Card } from "@monetio/ui";
import { AccountMatches } from "@/components/category-matches/AccountMatches";
import { UncategorisedGroups } from "@/components/category-matches/UncategorisedGroups";
import { listAccountMatches, listUncategorised } from "@/lib/data/category-matches";
import { listCategories } from "@/lib/data/queries";
import { uncategorisedGroups } from "@/lib/import/matches";
import { createClient } from "@/lib/supabase/server";

/** "Da categorizzare": uncategorised movements grouped by description, and the account's matches. */
export async function UncategorisedCard({ accountId }: { accountId: string }) {
  const supabase = await createClient();
  const [movements, matches, categories] = await Promise.all([listUncategorised(supabase, accountId), listAccountMatches(supabase, accountId), listCategories()]);
  const groups = uncategorisedGroups(movements);
  const usable = categories.filter((c) => !c.archived).map(({ id, name, kind }) => ({ id, name, kind }));
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const views = matches.map((m) => ({ id: m.id, description: m.sampleDescription, direction: m.direction, categoryName: names.get(m.categoryId) ?? "Categoria" }));
  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Da categorizzare"
        subtitle={movements.length ? `${movements.length === 1 ? "1 movimento" : `${movements.length} movimenti`} senza categoria, raggruppati per descrizione` : undefined}
        padding="none"
      >
        <UncategorisedGroups accountId={accountId} groups={groups} categories={usable} />
      </Card>
      <Card title="Abbinamenti del conto" subtitle="Descrizioni che ricevono la categoria da sole, in questo conto" padding="none" collapsible defaultOpen={false}>
        <AccountMatches matches={views} />
      </Card>
    </div>
  );
}
