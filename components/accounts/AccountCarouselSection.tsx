import { Skeleton } from "@monetio/ui";
import { loadMonthEndBalances } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { listAccounts } from "@/lib/data/queries";
import { todayISO } from "@/lib/domain/dates";
import { AccountCarousel } from "./AccountCarousel";
import { accountMembers } from "./AccountGrid";

/** Loads the accounts for the carousel; nothing when the household has none (the landing offers the form). */
export async function AccountCarouselSection() {
  const [ctx, accounts, monthEnd] = await Promise.all([getContext(), listAccounts(), loadMonthEndBalances()]);
  if (!accounts.length) return null;
  const items = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    institution: a.institution,
    type: a.type,
    balanceCents: a.balanceCents,
    members: accountMembers(a, ctx.members),
    archived: a.archived,
    monthEndCents: a.archived ? undefined : monthEnd[a.id],
  }));
  return <AccountCarousel accounts={items} today={todayISO()} />;
}

/** Placeholder row with the carousel's height. */
export function AccountCarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Caricamento conti">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width={288} height={172} radius="lg" className="shrink-0" />
      ))}
    </div>
  );
}
