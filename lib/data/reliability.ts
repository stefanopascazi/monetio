import "server-only";
import { cache } from "react";
import { addMonthsToKey, monthKey, startOfMonth } from "../domain/dates";
import { monthlySummary } from "../domain/monthly-summary";
import { assessReliability, type Reliability, type UncertaintyBand } from "../domain/reliability";
import { detectRecurring } from "../import/recurring";
import { createClient } from "../supabase/server";
import { loadAgenda } from "./agenda";
import { accountHistory, accountRules } from "./import-db";
import { listAccounts, listFlows, listLastBookedDates } from "./queries";
import { accountFacts, HISTORY_WINDOW } from "./reliability-facts";
import { touchesVisible } from "./rule-visibility";

export interface ReliabilityView extends Reliability {
  /** Per account: what the uncertainty band of its projection is built from. */
  bands: Record<string, UncertaintyBand>;
}

/** Reliability of the projection for the visible, non-archived accounts (one computation per request). */
export const loadReliability = cache(async (): Promise<ReliabilityView> => {
  const agenda = await loadAgenda();
  const { today } = agenda;
  const accounts = (await listAccounts()).filter((a) => !a.archived);
  const ids = accounts.map((a) => a.id);
  const visible = new Set(ids);
  const rules = agenda.rules.filter((r) => touchesVisible(r, visible));
  const contributions = agenda.contributions.filter((c) => visible.has(c.fromAccountId) || visible.has(c.toAccountId));
  const supabase = await createClient();

  const [flows, lastBooked, missing] = await Promise.all([
    listFlows(startOfMonth(addMonthsToKey(monthKey(today), -(HISTORY_WINDOW - 1)))),
    listLastBookedDates(ids),
    // Same detection the import uses to propose rules, run on each account's last 13 months.
    Promise.all(
      ids.map(async (id) => {
        const [past, existing] = await Promise.all([accountHistory(supabase, id, today), accountRules(supabase, id)]);
        return [id, detectRecurring(past, existing, today).filter((p) => p.amountCents < 0).length] as const;
      }),
    ),
  ]);

  const facts = accountFacts({
    accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
    today,
    lastBooked,
    flows,
    summary: monthlySummary(ids, rules, contributions, today),
    due: agenda.due,
    estimateRuleIds: new Set(rules.filter((r) => r.schedule === "estimate").map((r) => r.id)),
    missingRules: Object.fromEntries(missing),
  });
  const reliability = assessReliability(facts, today);
  const levels = new Map(reliability.accounts.map((a) => [a.accountId, a.level]));
  const bands = Object.fromEntries(facts.map((f) => [f.accountId, { avgMonthlyExpenseCents: f.avgMonthlyExpenseCents, level: levels.get(f.accountId) ?? "low" }]));
  return { ...reliability, bands };
});
