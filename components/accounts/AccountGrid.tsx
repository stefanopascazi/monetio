import type { AccountWithBalance } from "@/lib/data/queries";
import type { Member } from "@/lib/domain/types";
import { AccountLinkCard } from "./AccountLinkCard";

/** Names shown on an account card: everyone for shared accounts, the owner for private ones. */
export function accountMembers(
  a: Pick<AccountWithBalance, "visibility" | "ownerMemberId">,
  members: Member[],
): string[] {
  if (a.visibility === "shared") return members.map((m) => m.displayName);
  return members
    .filter((m) => m.id === a.ownerMemberId)
    .map((m) => m.displayName);
}

export function AccountGrid({
  accounts,
  members,
  monthEnd,
}: {
  accounts: AccountWithBalance[];
  members: Member[];
  /** Expected month-end balance per account; omitted for archived ones. */
  monthEnd?: Record<string, number>;
}) {
  return (
    <section
      aria-label="Conti"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {accounts.map((a) => (
        <AccountLinkCard
          key={a.id}
          href={`/conti/${a.id}`}
          name={a.name}
          institution={a.institution}
          type={a.type}
          balanceCents={a.balanceCents}
          members={accountMembers(a, members)}
          monthEndCents={monthEnd?.[a.id]}
        />
      ))}
    </section>
  );
}
