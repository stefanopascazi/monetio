import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountHeader } from "@/components/accounts/AccountHeader";
import { AccountSettings } from "@/components/accounts/AccountSettings";
import { StreamBlock } from "@/components/common/StreamBlock";
import { getContext } from "@/lib/data/context";
import { listAccounts } from "@/lib/data/queries";
import { recapMonth } from "@/lib/data/recap-month";
import { statementPeriod } from "@/lib/data/statement-period";
import { todayISO } from "@/lib/domain/dates";
import { BalanceHistoryCard } from "./sections/BalanceHistoryCard";
import { MonthNetNote } from "./sections/MonthNetNote";
import { MonthRecapCard } from "./sections/MonthRecapCard";
import { PlannedCard } from "./sections/PlannedCard";
import { StatementCard } from "./sections/StatementCard";
import { StatementEntry } from "./sections/StatementEntry";

/**
 * Header (balance, settings) shows as soon as the account is known; the statement, form,
 * chart and planned rows stream on their own.
 */
export async function StatementView({ id, searchParams }: { id: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [ctx, accounts, sp] = await Promise.all([getContext(), listAccounts(), searchParams]);
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  const today = todayISO();
  const period = statementPeriod(sp, today, account.openingDate);
  // Chart year follows the selected period; the latest rows show the current year.
  const year = Number((period.kind === "recent" ? today : period.to).slice(0, 4));
  const owner = ctx.members.find((m) => m.id === account.ownerMemberId);

  return (
    <>
      <AccountHeader
        name={account.name}
        context={account.visibility === "shared" ? "Conto condiviso" : `Conto privato di ${owner?.displayName ?? "un membro"}`}
        institution={account.institution}
        balanceCents={account.balanceCents}
        settings={<AccountSettings account={account} canMakePrivate={!account.ownerMemberId || account.ownerMemberId === ctx.me.id} />}
        note={
          <Suspense fallback={null}>
            <MonthNetNote accountId={id} balanceCents={account.balanceCents} />
          </Suspense>
        }
      />
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <StreamBlock height={120}>
            <StatementEntry accountId={id} today={today} />
          </StreamBlock>
          <StreamBlock height={160}>
            <MonthRecapCard accountId={id} balanceCents={account.balanceCents} today={today} month={recapMonth(sp.proiezione, today)} sp={sp} />
          </StreamBlock>
          <Suspense fallback={null}>
            <BalanceHistoryCard accountId={id} accountName={account.name} year={year} />
          </Suspense>
          <Suspense fallback={null}>
            <PlannedCard accountId={id} />
          </Suspense>
        </div>
        <StreamBlock height={480}>
          <StatementCard accountId={id} openingDate={account.openingDate} period={period} today={today} />
        </StreamBlock>
      </section>
    </>
  );
}
