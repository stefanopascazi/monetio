import { Amount, PageHeader } from "@monetio/ui";
import { createAccount } from "@/app/actions/accounts";
import { loadPendingTransfers } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { listAccounts } from "@/lib/data/queries";
import { todayISO } from "@/lib/domain/dates";
import { AccountForm } from "./AccountForm";
import { AccountGrid } from "./AccountGrid";

export async function AccountsView() {
  const [ctx, accounts, pending] = await Promise.all([getContext(), listAccounts(), loadPendingTransfers()]);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const shared = active.filter((a) => a.visibility === "shared").reduce((s, a) => s + a.balanceCents, 0);
  const mine = active.filter((a) => a.visibility === "private").reduce((s, a) => s + a.balanceCents, 0);

  return (
    <>
      <PageHeader title="Conti" description="Tocca un conto per vedere l'estratto conto e le impostazioni." />
      <section className="grid grid-cols-2 gap-4 sm:max-w-xl">
        <div className="flex flex-col gap-1 rounded-[22px] bg-brand-soft p-4">
          <span className="text-sm text-ink-muted">Conti condivisi</span>
          <Amount cents={shared} tone="neutral" size="lg" />
        </div>
        <div className="flex flex-col gap-1 rounded-[22px] bg-surface p-4">
          <span className="text-sm text-ink-muted">Conti privati</span>
          <Amount cents={mine} tone="neutral" size="lg" />
        </div>
      </section>
      <AccountGrid accounts={active} members={ctx.members} pending={pending} />
      <AccountForm action={createAccount} defaults={{ openingDate: todayISO() }} />
      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Archiviati</h2>
          <AccountGrid accounts={archived} members={ctx.members} />
        </section>
      )}
    </>
  );
}
