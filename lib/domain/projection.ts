import { feeDescription, feeSource } from "./fees";
import { contributionAmount, contributionBase } from "./contribution";
import { addDays, addMonthsToKey, endOfMonth, monthKey, startOfMonth } from "./dates";
import { type EstimateMovement, estimatePool } from "./estimates";
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
  /** Amount booked in a month towards an estimate rule (positive cents): only for the card statement check. */
  estimateUsed: (rule: RecurringRule, month: string) => number;
  /** Planned one-off transactions. */
  planned: Transaction[];
  /** How far back unpaid deadlines are still expected to happen. */
  lookbackDays?: number;
  /** Actual amounts/dates entered for single occurrences. */
  overrides?: OverrideMap;
  /**
   * Card accounts: spending is entered as last month's statement, so a statement booked
   * in the previous month already covers the current month's estimate.
   */
  cardAccountIds?: Set<string>;
  /** Current month's booked movements that reduce decreasing estimates. */
  estimateMovements?: EstimateMovement[];
}

export interface ProjectionMonth {
  month: string;
  byAccount: Record<string, number>;
  totalCents: number;
}

/** Where a projected movement comes from, for the month detail. */
export type MovementSource = "rule" | "estimate" | "contribution" | "planned";

export interface Movement {
  date: ISODate;
  accountId: string;
  amountCents: number;
  label: string;
  source: MovementSource;
  /** Due before today and still unpaid: counted as if it happened today. */
  overdue?: boolean;
  /** Estimates: occurrence key (`r:<rule>|<period>`), to close or book it. */
  ref?: string;
  /** Category of the rule or planned transaction, when it has one. */
  categoryId?: string | null;
  /** Transfers: the other account of the pair. */
  counterpartId?: string;
}


/**
 * Expected movements after today, only from rules, contributions and planned transactions:
 * the projection reflects what is declared, without historical averages.
 */
export function projectedMovements(input: ProjectionInput): Movement[] {
  const { today, rules, contributions, booked, planned, lookbackDays = 90 } = input;
  const currentMonth = monthKey(today);
  const end = endOfMonth(addMonthsToKey(currentMonth, input.months - 1));
  const from = addDays(today, -lookbackDays);
  const out: Movement[] = [];
  // Overdue items still count, as if they happened today.
  const push = (
    date: ISODate,
    accountId: string,
    amountCents: number,
    counterpart: string | null,
    label: string,
    source: MovementSource,
    ref?: string,
    categoryId: string | null = null,
  ) => {
    const overdue = date < today;
    const d = overdue ? today : date;
    out.push({ date: d, accountId, amountCents, label, source, overdue, ref, categoryId, ...(counterpart ? { counterpartId: counterpart } : {}) });
    if (counterpart) out.push({ date: d, accountId: counterpart, amountCents: -amountCents, label, source, overdue, ref, categoryId, counterpartId: accountId });
  };
  const draw = estimatePool(input.estimateMovements ?? []);

  for (const r of rules) {
    if (!r.active) continue;
    const counterpart = r.kind === "transfer" ? r.counterpartAccountId : null;
    if (r.schedule === "estimate") {
      // Past months are never carried over: an unused remainder ends with its month.
      for (const d of occurrences(r, startOfMonth(currentMonth), end)) {
        const key = ruleKey(r.id, d, r.frequency);
        // Booked as a movement, or closed from the month recap (zero amount).
        if (booked.has(key) || input.overrides?.get(key)?.amountCents === 0) continue;
        let amount = r.amountCents;
        if (monthKey(d) === currentMonth) {
          const covered = input.cardAccountIds?.has(r.accountId) && input.estimateUsed(r, addMonthsToKey(currentMonth, -1)) > 0;
          // Fixed estimates count in full; decreasing ones lose what was booked in their categories.
          const full = Math.abs(r.amountCents);
          amount = covered ? 0 : Math.sign(r.amountCents) * (full - draw(r, full));
        }
        if (amount) push(d, r.accountId, amount, counterpart, r.description, "estimate", key, r.categoryId);
      }
      continue;
    }
    for (const d of occurrences(r, from, end)) {
      const key = ruleKey(r.id, d, r.frequency);
      if (booked.has(key)) continue;
      const o = input.overrides?.get(key);
      push(o?.dueDate ?? d, r.accountId, o?.amountCents ?? r.amountCents, counterpart, r.description, "rule", undefined, r.categoryId);
      // Bonifico/CBill/transfer fee, booked as its own expense of the paying account with each occurrence.
      const source = feeSource(r.kind, r.paymentMethod);
      if (source && r.feeCents) push(o?.dueDate ?? d, r.accountId, -r.feeCents, null, feeDescription(source, r.description), "rule");
    }
  }

  for (const c of contributions) {
    if (!c.active) continue;
    const dates = occurrences({ frequency: "monthly", dayOfMonth: c.dayOfMonth, startDate: c.startDate, endDate: c.endDate }, from, end);
    for (const d of dates) {
      if (booked.has(contributionKey(c.id, d))) continue;
      const { baseCents } = contributionBase(c, monthKey(d), currentMonth, input.contributionSpending);
      push(d, c.fromAccountId, -contributionAmount(c, baseCents), c.toAccountId, c.description, "contribution");
    }
  }

  for (const t of planned) {
    if (t.status === "planned") push(t.bookedOn, t.accountId, t.amountCents, null, t.description, "planned", undefined, t.categoryId);
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
