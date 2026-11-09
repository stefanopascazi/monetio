import { Amount } from "@monetio/ui";
import { getContext } from "@/lib/data/context";
import { BALANCES_CLASS } from "@/lib/privacy/balance-privacy";
import { visibilityTotals } from "@/lib/domain/account-totals";
import { monthLabel } from "@/lib/domain/dates";
import { loadActiveAccounts, loadDashboardFlows } from "../data";

/** Greeting, total balance of the visible accounts and its shared/private split. */
export async function BalanceHero() {
  const [ctx, { active }, { month }] = await Promise.all([getContext(), loadActiveAccounts(), loadDashboardFlows()]);
  const total = active.reduce((s, a) => s + a.balanceCents, 0);
  const split = visibilityTotals(active);
  return (
    <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-surface p-6">
      <p className="text-ink-muted">
        Ciao {ctx.me.displayName}, ecco la situazione di {monthLabel(month, true)}.
      </p>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">Saldo dei conti che vedi</span>
        <Amount cents={total} tone="neutral" size="xl" className={BALANCES_CLASS} />
        <dl className={`flex flex-wrap gap-x-6 gap-y-1 text-sm ${BALANCES_CLASS}`}>
          <div className="flex items-center gap-2">
            <dt className="text-ink-muted">Condivisi</dt>
            <dd><Amount cents={split.shared} tone="neutral" size="sm" /></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-ink-muted">Privati</dt>
            <dd><Amount cents={split.private} tone="neutral" size="sm" /></dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
