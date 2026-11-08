import { MonthRecapList } from "@/components/accounts/MonthRecapList";
import { PeriodNav } from "@/components/common/PeriodNav";
import { loadAccountMonthRecap } from "@/lib/data/agenda";
import { withQuery } from "@/lib/data/params";
import { recapNav } from "@/lib/data/recap-month";
import { monthKey, monthLabel } from "@/lib/domain/dates";

type Params = Record<string, string | string[] | undefined>;

/** Month recap of the account, browsable from this month into the projected ones. */
export async function MonthRecapCard({ accountId, balanceCents, today, month, sp }: { accountId: string; balanceCents: number; today: string; month: string; sp: Params }) {
  const recap = await loadAccountMonthRecap(accountId, balanceCents, month);
  const nav = recapNav(month, today);
  // Keeps the statement filters while moving the recap.
  const href = (m: string | null) => {
    if (!m) return null;
    const query = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    return withQuery(`/conti/${accountId}`, { ...query, proiezione: m === monthKey(today) ? undefined : m });
  };
  return (
    <MonthRecapList
      recap={recap}
      current={month === monthKey(today)}
      nav={<PeriodNav label={monthLabel(month, true)} prevHref={href(nav.prev)} nextHref={href(nav.next)} />}
    />
  );
}
