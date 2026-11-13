import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountSettings } from "@/components/accounts/AccountSettings";
import { RememberAccount } from "@/components/accounts/RememberAccount";
import { SwipeArea } from "@/components/accounts/SwipeArea";
import { StreamBlock } from "@/components/common/StreamBlock";
import { TopBarAction } from "@/components/shell/TopBarAction";
import { getContext } from "@/lib/data/context";
import { listAccounts } from "@/lib/data/queries";
import { recapMonth } from "@/lib/data/recap-month";
import { statementPeriod } from "@/lib/data/statement-period";
import { todayISO } from "@/lib/domain/dates";
import { accountHref, adjacentAccounts, switcherAccounts } from "@/lib/navigation/account-nav";
import { AccountPanes } from "./AccountPanes";
import { BalanceHistoryCard } from "./sections/BalanceHistoryCard";
import { MonthRecapCard } from "./sections/MonthRecapCard";
import { PlannedCard } from "./sections/PlannedCard";
import { StatementCard } from "./sections/StatementCard";

/**
 * Account page body: name, balance and colour live in the carousel card above (conti layout),
 * the settings gear sits in the top bar. Statement, recap, chart and planned rows stream on their own.
 * New movements come from the top bar "+".
 */
export async function StatementView({ id, searchParams }: { id: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [ctx, accounts, sp] = await Promise.all([getContext(), listAccounts(), searchParams]);
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  const today = todayISO();
  const period = statementPeriod(sp, today, account.openingDate);
  // Chart year follows the selected period; the latest rows show the current year.
  const year = Number((period.kind === "recent" ? today : period.to).slice(0, 4));
  // Swipe targets follow the carousel order and keep the selected period.
  const { prev, next } = adjacentAccounts(switcherAccounts(accounts, id), id);
  const prevHref = prev && accountHref(prev.id, sp);
  const nextHref = next && accountHref(next.id, sp);

  return (
    <>
      <RememberAccount id={id} />
      <h1 className="sr-only">{account.name}</h1>
      <TopBarAction>
        <AccountSettings account={account} canMakePrivate={!account.ownerMemberId || account.ownerMemberId === ctx.me.id} />
      </TopBarAction>
      <SwipeArea prevHref={prevHref} nextHref={nextHref}>
        <AccountPanes
          side={
            <>
              <StreamBlock height={160}>
                <MonthRecapCard accountId={id} balanceCents={account.balanceCents} today={today} month={recapMonth(sp.proiezione, today)} sp={sp} />
              </StreamBlock>
              <Suspense fallback={null}>
                <BalanceHistoryCard accountId={id} accountName={account.name} year={year} />
              </Suspense>
              <Suspense fallback={null}>
                <PlannedCard accountId={id} />
              </Suspense>
            </>
          }
          statement={
            <StreamBlock height={480}>
              <StatementCard accountId={id} openingDate={account.openingDate} period={period} today={today} />
            </StreamBlock>
          }
        />
      </SwipeArea>
    </>
  );
}
