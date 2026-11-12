// Pure assembly of the agenda and the projection input from raw lists. The app loaders (agenda.ts)
// and the VPS worker (notifications) feed it the same data, so both see the same figures.
import { addMonthsToKey, monthKey } from "../domain/dates";
import type { EstimateMovement } from "../domain/estimates";
import { isDecreasing } from "../domain/estimates";
import type { ProjectionInput } from "../domain/projection";
import { bookedOccurrences, dueEntries, overrideMap, upcomingOccurrences } from "../domain/schedule";
import type { Account, ContributionRule, OccurrenceOverride, RecurringRule, Transaction } from "../domain/types";
import { contributionSpendingFrom, estimateUsedFrom, type MonthlyFlow } from "./flow-math";
import { touchesVisible } from "./rule-visibility";

export const LOOKBACK_DAYS = 90;

export interface AccountWithBalance extends Account {
  balanceCents: number;
}

export interface BookedOccurrence {
  recurringRuleId: string | null;
  contributionRuleId: string | null;
  occurrenceDate: string | null;
}

export interface AgendaRaw {
  today: string;
  rules: RecurringRule[];
  contributions: ContributionRule[];
  occurrences: BookedOccurrence[];
  /** Monthly flows since the lookback start. */
  flows: MonthlyFlow[];
  overrides: OccurrenceOverride[];
}

export function buildAgenda({ today, rules, contributions, occurrences, flows, overrides: list }: AgendaRaw) {
  const booked = bookedOccurrences(occurrences, rules);
  const overrides = overrideMap(list);
  return {
    today,
    rules,
    contributions,
    booked,
    flows,
    overrides,
    due: dueEntries(rules, contributions, booked, today, contributionSpendingFrom(flows), { lookbackDays: LOOKBACK_DAYS, horizonDays: 31, overrides }),
    upcoming: upcomingOccurrences(
      rules.filter((r) => r.schedule === "auto"),
      booked,
      today,
      31,
    ),
  };
}

export type Agenda = ReturnType<typeof buildAgenda>;

/** Categories whose booked movements this month reduce decreasing estimates. */
export const decrementCategories = (rules: RecurringRule[]) => [...new Set(rules.filter(isDecreasing).flatMap((r) => r.decrementCategoryIds))];

/** First month whose flows the projection needs (previous month: quotas and estimates so far). */
export const projectionFlowsSince = (today: string) => addMonthsToKey(monthKey(today), -1);

export interface ProjectionRaw {
  accounts: AccountWithBalance[];
  /** Planned (not yet booked) transactions. */
  planned: Transaction[];
  /** Flows of the current and previous month. */
  monthFlows: MonthlyFlow[];
  estimateMovements: EstimateMovement[];
}

/** Projection input for the visible, non-archived accounts over `months` month ends. */
export function buildProjectionInput(agenda: Agenda, { accounts, planned, monthFlows, estimateMovements }: ProjectionRaw, months: number) {
  const active = accounts.filter((a) => !a.archived);
  const ids = new Set(active.map((a) => a.id));
  // Includes transfers from accounts the viewer cannot see (e.g. a private quota into the joint account).
  const rules = agenda.rules.filter((r) => touchesVisible(r, ids));
  const contributions = agenda.contributions.filter((c) => ids.has(c.fromAccountId) || ids.has(c.toAccountId));
  const input: ProjectionInput = {
    today: agenda.today,
    months,
    balances: Object.fromEntries(active.map((a) => [a.id, a.balanceCents])),
    rules,
    contributions,
    booked: agenda.booked,
    contributionSpending: contributionSpendingFrom(monthFlows),
    estimateUsed: estimateUsedFrom(monthFlows),
    planned: planned.filter((t) => ids.has(t.accountId)),
    lookbackDays: LOOKBACK_DAYS,
    overrides: agenda.overrides,
    cardAccountIds: new Set(active.filter((a) => a.type === "card").map((a) => a.id)),
    estimateMovements,
  };
  return { active, ids, rules, contributions, input };
}
