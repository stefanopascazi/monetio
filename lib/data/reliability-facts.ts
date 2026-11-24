// Turns stored data (monthly flows, rule summary, deadlines) into the facts the reliability score reads.
import { addMonthsToKey, monthKey } from "../domain/dates";
import type { AccountMonthlySummary } from "../domain/monthly-summary";
import type { AccountFacts, BankLinkState, MissingRule } from "../domain/reliability";
import type { DueEntry } from "../domain/schedule";
import type { AccountType, ISODate } from "../domain/types";
import type { MonthlyFlow } from "./flows";

/** Months of history the score looks at, and full months averaged for the spending. */
export const HISTORY_WINDOW = 12;
export const SPENDING_MONTHS = 3;
/** A bank sync older than this means the link is stuck, even without an error. */
export const BANK_SYNC_MAX_AGE_HOURS = 48;

/** Bank link flags of one account, as `bank_link_states` returns them. */
export interface BankLinkRow {
  account_id: string;
  consent_active: boolean;
  last_synced_at: string | null;
  failing: boolean;
}

/** Synced only with a valid consent and a recent, successful sync. */
export function bankLinkState(row: BankLinkRow, now: Date): BankLinkState {
  if (!row.consent_active) return "expired";
  const synced = row.last_synced_at ? Date.parse(row.last_synced_at) : NaN;
  const recent = now.getTime() - synced <= BANK_SYNC_MAX_AGE_HOURS * 3_600_000;
  return !row.failing && recent ? "synced" : "failing";
}

export interface FactsInput {
  accounts: { id: string; name: string; type: AccountType }[];
  today: ISODate;
  /** Latest booked movement per account. */
  lastBooked: Record<string, ISODate | null>;
  /** Monthly flows covering at least the last HISTORY_WINDOW months. */
  flows: MonthlyFlow[];
  summary: Record<string, AccountMonthlySummary>;
  due: DueEntry[];
  /** Rules whose occurrences are estimates (closed or booked by hand). */
  estimateRuleIds: ReadonlySet<string>;
  missingRules: Record<string, MissingRule[]>;
  /** Bank link per account; absent accounts are kept by hand. */
  bankLinks?: Record<string, BankLinkState>;
}

export function accountFacts(i: FactsInput): AccountFacts[] {
  const current = monthKey(i.today);
  const windowStart = addMonthsToKey(current, -(HISTORY_WINDOW - 1));
  const spendingStart = addMonthsToKey(current, -SPENDING_MONTHS);
  return i.accounts.map((a) => {
    const months = new Set<string>();
    let spent = 0;
    for (const f of i.flows) {
      if (f.accountId !== a.id || f.month < windowStart || f.month > current) continue;
      if (f.kind !== "adjustment") months.add(f.month);
      // Full months only: the current one is still running.
      if (f.kind === "expense" && f.month >= spendingStart && f.month < current) spent -= f.totalCents;
    }
    const overdue = i.due.filter((d) => d.overdue && d.accountId === a.id);
    const estimates = overdue.filter((d) => d.source === "rule" && i.estimateRuleIds.has(d.ruleId)).length;
    return {
      accountId: a.id,
      name: a.name,
      lastBookedOn: i.lastBooked[a.id] ?? null,
      historyMonths: months.size,
      avgMonthlyExpenseCents: Math.max(0, Math.round(spent / SPENDING_MONTHS)),
      declaredMonthlyExpenseCents: i.summary[a.id]?.rulesExpenseCents ?? 0,
      overdueCount: overdue.length - estimates,
      openEstimates: estimates,
      missingRules: i.missingRules[a.id] ?? [],
      quiet: a.type === "savings" || a.type === "investment",
      bank: i.bankLinks?.[a.id] ?? null,
    };
  });
}
