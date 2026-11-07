import { type ReactNode, Suspense } from "react";
import { Skeleton } from "@monetio/ui";
import { AccountsSection } from "./sections/AccountsSection";
import { BalanceHero } from "./sections/BalanceHero";
import { CashflowCard } from "./sections/CashflowCard";
import { CategoryCard } from "./sections/CategoryCard";
import { MonthStats } from "./sections/MonthStats";
import { ProjectionCard } from "./sections/ProjectionCard";
import { QuickEntry } from "./sections/QuickEntry";
import { RecentTransactions } from "./sections/RecentTransactions";
import { UpcomingDue } from "./sections/UpcomingDue";

/** One dashboard block streaming on its own, with a placeholder of similar height. */
function Block({ height, children }: { height: number; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-label="Caricamento">
          <Skeleton height={height} radius="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Balance and recent movements show without waiting for the slower agenda and projection.
 * Shared reads are deduplicated per request (React cache).
 */
export function Dashboard() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Block height={180}>
          <BalanceHero />
        </Block>
        <Block height={180}>
          <MonthStats />
        </Block>
      </section>

      <Block height={140}>
        <AccountsSection />
      </Block>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Block height={120}>
          <QuickEntry />
        </Block>
        <Block height={280}>
          <UpcomingDue />
        </Block>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Block height={320}>
          <CashflowCard />
        </Block>
        <Block height={320}>
          <ProjectionCard />
        </Block>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Block height={320}>
          <CategoryCard />
        </Block>
        <Block height={320}>
          <RecentTransactions />
        </Block>
      </section>
    </>
  );
}
