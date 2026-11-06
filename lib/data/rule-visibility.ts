import type { RecurringRule } from "../domain/types";

type RuleAccounts = Pick<RecurringRule, "accountId" | "counterpartAccountId">;

/** The viewer manages the rule (edit, pay, book) only when they see the paying account. */
export const ownsRule = (rule: RuleAccounts, visible: ReadonlySet<string>) => visible.has(rule.accountId);

/** The rule moves money on at least one account the viewer sees (paying side or counterpart). */
export const touchesVisible = (rule: RuleAccounts, visible: ReadonlySet<string>) =>
  visible.has(rule.accountId) || (rule.counterpartAccountId != null && visible.has(rule.counterpartAccountId));
