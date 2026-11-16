import { MonthRecapList } from "@/components/accounts/MonthRecapList";
import { RecapMonthNav } from "@/components/accounts/RecapMonthNav";
import { loadAccountMonthRecap } from "@/lib/data/agenda";
import { withQuery } from "@/lib/data/params";
import { listTransactions } from "@/lib/data/queries";
import { toTxnView } from "@/lib/data/views";
import { recapNav } from "@/lib/data/recap-month";
import { monthKey, monthLabel } from "@/lib/domain/dates";
import { loadStatementRefs } from "../data";

type Params = Record<string, string | string[] | undefined>;

/** Month recap of the account, browsable from this month into the projected ones; planned rows are edited in place. */
export async function MonthRecapCard({ accountId, balanceCents, today, month, sp }: { accountId: string; balanceCents: number; today: string; month: string; sp: Params }) {
  const [recap, { accounts, categories, members, refs, catRefs }, planned] = await Promise.all([
    loadAccountMonthRecap(accountId, balanceCents, month),
    loadStatementRefs(),
    listTransactions({ accountId, status: "planned", limit: 200 }),
  ]);
  const editing = { planned: Object.fromEntries(planned.map((t) => [t.id, toTxnView(t, accounts, categories, members)])), accounts: refs, categories: catRefs };
  const nav = recapNav(month, today);
  // Keeps the statement filters while moving the recap.
  const current = monthKey(today);
  const href = (m: string | null) => {
    if (!m) return null;
    const query = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    return withQuery(`/conti/${accountId}`, { ...query, proiezione: m === current ? undefined : m });
  };
  return (
    <MonthRecapList
      recap={recap}
      current={month === current}
      today={today}
      editing={editing}
      nav={<RecapMonthNav label={monthLabel(month, true)} prevHref={href(nav.prev)} nextHref={href(nav.next)} resetHref={month === current ? null : href(current)} />}
    />
  );
}
