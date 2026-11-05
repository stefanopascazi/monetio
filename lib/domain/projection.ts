import { contributionAmount, contributionBase } from "./contribution";
import { addDays, addMonthsToKey, endOfMonth, monthKey, startOfMonth } from "./dates";
import { occurrences } from "./recurrence";
import { contributionKey, type OverrideMap, ruleKey } from "./schedule";
import type { ContributionRule, ISODate, RecurringRule, Transaction } from "./types";

export interface ProjectionInput {
  today: ISODate;
  /** Number of month-end points, starting with the current month. */
  months: number;
  /** Current booked balance per account. */
  balances: Record<string, number>;
  rules: RecurringRule[];
  contributions: ContributionRule[];
  booked: Set<string>;
  /** Shared spending booked so far for a contribution in a month (positive cents). */
  contributionSpending: (rule: ContributionRule, month: string) => number;
  /** Spending booked so far in a month on an account/category (positive cents), for estimate rules. */
  categorySpent: (accountId: string, categoryId: string | null, month: string) => number;
  /** Planned one-off transactions. */
  planned: Transaction[];
  /** How far back unpaid deadlines are still expected to happen. */
  lookbackDays?: number;
  /** Actual amounts/dates entered for single occurrences. */
  overrides?: OverrideMap;
}

export interface ProjectionMonth {
  month: string;
  byAccount: Record<string, number>;
  totalCents: number;
}

interface Movement {
  date: ISODate;
  accountId: string;
  amountCents: number;
}

/** Expected movements after today, from rules, contributions and planned transactions. */
export function projectedMovements(input: ProjectionInput): Movement[] {
  const { today, rules, contributions, booked, planned, lookbackDays = 90 } = input;
  const currentMonth = monthKey(today);
  const end = endOfMonth(addMonthsToKey(currentMonth, input.months - 1));
  const from = addDays(today, -lookbackDays);
  const out: Movement[] = [];
  // Overdue items still count, as if they happened today.
  const push = (date: ISODate, accountId: string, amountCents: number, counterpart: string | null) => {
    const d = date < today ? today : date;
    out.push({ date: d, accountId, amountCents });
    if (counterpart) out.push({ date: d, accountId: counterpart, amountCents: -amountCents });
  };

  for (const r of rules) {
    if (!r.active) continue;
    const counterpart = r.kind === "transfer" ? r.counterpartAccountId : null;
    if (r.schedule === "estimate") {
      for (const d of occurrences(r, startOfMonth(currentMonth), end)) {
        let amount = r.amountCents;
        if (monthKey(d) === currentMonth) {
          const remaining = Math.max(0, Math.abs(r.amountCents) - input.categorySpent(r.accountId, r.categoryId, currentMonth));
          amount = Math.sign(r.amountCents) * remaining;
        }
        if (amount) push(d, r.accountId, amount, counterpart);
      }
      continue;
    }
    for (const d of occurrences(r, from, end)) {
      const key = ruleKey(r.id, d, r.frequency);
      if (booked.has(key)) continue;
      const o = input.overrides?.get(key);
      push(o?.dueDate ?? d, r.accountId, o?.amountCents ?? r.amountCents, counterpart);
    }
  }

  for (const c of contributions) {
    if (!c.active) continue;
    const dates = occurrences({ frequency: "monthly", dayOfMonth: c.dayOfMonth, startDate: c.startDate, endDate: c.endDate }, from, end);
    for (const d of dates) {
      if (booked.has(contributionKey(c.id, d))) continue;
      const { baseCents } = contributionBase(c, monthKey(d), currentMonth, input.contributionSpending);
      push(d, c.fromAccountId, -contributionAmount(c, baseCents), c.toAccountId);
    }
  }

  for (const t of planned) {
    if (t.status === "planned") push(t.bookedOn, t.accountId, t.amountCents, null);
  }
  return out;
}

/** Month-end balances per account from the current month on. */
export function projectBalances(input: ProjectionInput): ProjectionMonth[] {
  const movements = projectedMovements(input).sort((a, b) => a.date.localeCompare(b.date));
  const running = { ...input.balances };
  const result: ProjectionMonth[] = [];
  let i = 0;
  for (let n = 0; n < input.months; n++) {
    const month = addMonthsToKey(monthKey(input.today), n);
    const last = endOfMonth(month);
    for (; i < movements.length && movements[i].date <= last; i++) {
      const m = movements[i];
      running[m.accountId] = (running[m.accountId] ?? 0) + m.amountCents;
    }
    const byAccount = { ...running };
    result.push({ month, byAccount, totalCents: Object.values(byAccount).reduce((s, v) => s + v, 0) });
  }
  return result;
}
