// Serializable view models passed from Server to Client Components.
import type { Account, Category, Member, Transaction } from "../domain/types";

export interface TxnView {
  id: string;
  description: string;
  notes: string | null;
  amountCents: number;
  kind: Transaction["kind"];
  status: Transaction["status"];
  bookedOn: string;
  accountId: string;
  accountName: string;
  counterpartAccountId: string | null;
  counterpartName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  colorIndex: 1 | 2 | 3 | 4 | 5 | 6;
  source: Transaction["source"];
  recurring: boolean;
  isTransfer: boolean;
  /** Display name of whoever entered it; null when unknown (imports, automatic bookings). */
  createdByName: string | null;
  balanceAfterCents?: number;
}

export const HIDDEN_ACCOUNT = "Conto privato";
export const FORMER_MEMBER = "Ex membro";

/** Name of the member who created a transaction; FORMER_MEMBER when the user left the household. */
export function creatorName(createdBy: string | null, members: Pick<Member, "userId" | "displayName">[]): string | null {
  if (!createdBy) return null;
  return members.find((m) => m.userId === createdBy)?.displayName ?? FORMER_MEMBER;
}

export function toTxnView(
  t: Transaction & { balanceAfterCents?: number },
  accounts: Pick<Account, "id" | "name">[],
  categories: Category[],
  members: Pick<Member, "userId" | "displayName">[] = [],
): TxnView {
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const cat = categories.find((c) => c.id === t.categoryId);
  return {
    id: t.id,
    description: t.description,
    notes: t.notes,
    amountCents: t.amountCents,
    kind: t.kind,
    status: t.status,
    bookedOn: t.bookedOn,
    accountId: t.accountId,
    accountName: acc.get(t.accountId) ?? HIDDEN_ACCOUNT,
    counterpartAccountId: t.counterpartAccountId,
    counterpartName: t.counterpartAccountId ? (acc.get(t.counterpartAccountId) ?? HIDDEN_ACCOUNT) : null,
    categoryId: t.categoryId,
    categoryName: cat?.name ?? null,
    categoryIcon: cat?.icon ?? (t.kind === "transfer" ? "arrow-left-right" : null),
    colorIndex: cat?.colorIndex ?? 3,
    source: t.source,
    recurring: !!(t.recurringRuleId || t.contributionRuleId),
    isTransfer: !!t.transferGroupId || t.kind === "transfer",
    createdByName: creatorName(t.createdBy, members),
    balanceAfterCents: t.balanceAfterCents,
  };
}

export const SOURCE_LABEL: Record<Transaction["source"], string> = {
  manual: "Inserito a mano",
  import: "Importato dal foglio",
  rule: "Da ricorrenza",
  contribution: "Da quota automatica",
};
