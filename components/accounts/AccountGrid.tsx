import Link from "next/link";
import { AccountCard } from "@monetio/ui";
import type { AccountWithBalance } from "@/lib/data/queries";
import { MonthEndNote } from "./MonthEndNote";
import type { Member } from "@/lib/domain/types";

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
        <Link
          key={a.id}
          href={`/conti/${a.id}`}
          className="rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <AccountCard
            name={a.name}
            institution={a.institution ?? undefined}
            type={a.type}
            balanceCents={a.balanceCents}
            members={accountMembers(a, members)}
            footer={monthEnd?.[a.id] !== undefined ? <MonthEndNote cents={monthEnd[a.id]} /> : undefined}
          />
        </Link>
      ))}
    </section>
  );
}
