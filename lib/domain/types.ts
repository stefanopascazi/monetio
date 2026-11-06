// Domain types shared by the server data layer, pure logic and UI.

/** Calendar date as `YYYY-MM-DD` (no time zone). */
export type ISODate = string;

export type AccountType = "checking" | "savings" | "investment" | "card" | "cash";
export type Visibility = "shared" | "private";
export type TransactionKind = "income" | "expense" | "transfer" | "adjustment";
export type TransactionStatus = "booked" | "planned";
export type RuleFrequency = "weekly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "yearly";
export type RuleSchedule = "auto" | "due" | "estimate";

export interface Member {
  id: string;
  displayName: string;
  email: string | null;
  userId: string | null;
  role: "owner" | "member";
}

export interface Account {
  id: string;
  name: string;
  institution: string | null;
  type: AccountType;
  visibility: Visibility;
  ownerMemberId: string | null;
  openingBalanceCents: number;
  openingDate: ISODate;
  sortOrder: number;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense" | "both";
  icon: string | null;
  colorIndex: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface Transaction {
  id: string;
  accountId: string;
  counterpartAccountId: string | null;
  categoryId: string | null;
  kind: TransactionKind;
  status: TransactionStatus;
  amountCents: number;
  bookedOn: ISODate;
  description: string;
  notes: string | null;
  transferGroupId: string | null;
  recurringRuleId: string | null;
  contributionRuleId: string | null;
  occurrenceDate: ISODate | null;
  source: "manual" | "import" | "rule" | "contribution";
  /** Auth user id of whoever entered it; null for imports and automatic bookings. */
  createdBy: string | null;
}

export interface RecurringRule {
  id: string;
  accountId: string;
  counterpartAccountId: string | null;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer";
  description: string;
  /** Signed from the point of view of accountId. */
  amountCents: number;
  frequency: RuleFrequency;
  schedule: RuleSchedule;
  dayOfMonth: number;
  startDate: ISODate;
  endDate: ISODate | null;
  active: boolean;
}

/** Actual amount/due date of one occurrence of a rule, entered before paying (e.g. a bill). */
export interface OccurrenceOverride {
  ruleId: string;
  /** `YYYY-MM` for month-based rules, the date for weekly ones. */
  period: string;
  /** Signed from the point of view of the rule's account. */
  amountCents: number;
  dueDate: ISODate;
  note: string | null;
}

export interface ContributionRule {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  description: string;
  fixedCents: number;
  sharePercent: number;
  categoryIds: string[];
  roundingCents: number;
  dayOfMonth: number;
  estimatedSpendingCents: number;
  /** Account whose spending is shared; null means the receiving account. */
  spendingAccountId: string | null;
  /** 0 = same month as the transfer, -1 = previous month (e.g. card statement). */
  spendingMonthOffset: 0 | -1;
  startDate: ISODate;
  endDate: ISODate | null;
  active: boolean;
}
