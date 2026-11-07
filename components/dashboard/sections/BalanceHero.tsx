import { Amount } from "@monetio/ui";
import { getContext } from "@/lib/data/context";
import { monthLabel } from "@/lib/domain/dates";
import { loadActiveAccounts, loadDashboardFlows } from "../data";

/** Greeting and total balance of the visible accounts. */
export async function BalanceHero() {
  const [ctx, { active }, { month }] = await Promise.all([getContext(), loadActiveAccounts(), loadDashboardFlows()]);
  const total = active.reduce((s, a) => s + a.balanceCents, 0);
  return (
    <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-surface p-6">
      <p className="text-ink-muted">
        Ciao {ctx.me.displayName}, ecco la situazione di {monthLabel(month, true)}.
      </p>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">Saldo dei conti che vedi</span>
        <Amount cents={total} tone="neutral" size="xl" />
      </div>
    </div>
  );
}
