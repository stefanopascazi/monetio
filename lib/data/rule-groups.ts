import type { RecurringRule } from "../domain/types";

export interface RuleGroup<T> {
  accountId: string;
  accountName: string;
  /** Automatic and due rules: real money movements. */
  effective: T[];
  /** Projection-only budgets. */
  estimates: T[];
}

const normalize = (s: string) => s.toLocaleLowerCase("it").normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Filters rules by a free-text query (description, account, category) and groups them by
 * paying account, splitting real movements from estimates. Accounts follow `accountOrder`.
 */
export function groupRules<T extends Pick<RecurringRule, "accountId" | "schedule" | "description"> & { accountName: string; categoryName?: string | null }>(
  rules: T[],
  accountOrder: { id: string; name: string }[],
  query = "",
): RuleGroup<T>[] {
  const q = normalize(query.trim());
  const matches = (r: T) => !q || [r.description, r.accountName, r.categoryName ?? ""].some((s) => normalize(s).includes(q));
  const groups = new Map<string, RuleGroup<T>>();
  for (const r of rules.filter(matches)) {
    const name = accountOrder.find((a) => a.id === r.accountId)?.name ?? r.accountName.split(" → ")[0];
    const g = groups.get(r.accountId) ?? { accountId: r.accountId, accountName: name, effective: [], estimates: [] };
    (r.schedule === "estimate" ? g.estimates : g.effective).push(r);
    groups.set(r.accountId, g);
  }
  const rank = (id: string) => {
    const i = accountOrder.findIndex((a) => a.id === id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const byDescription = (a: T, b: T) => a.description.localeCompare(b.description, "it");
  return [...groups.values()]
    .sort((a, b) => rank(a.accountId) - rank(b.accountId) || a.accountName.localeCompare(b.accountName, "it"))
    .map((g) => ({ ...g, effective: g.effective.sort(byDescription), estimates: g.estimates.sort(byDescription) }));
}
