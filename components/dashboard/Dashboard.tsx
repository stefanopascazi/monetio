import { StreamBlock } from "@/components/common/StreamBlock";
import { ReliabilitySection } from "@/components/reliability/ReliabilitySection";
import { AccountsSection } from "./sections/AccountsSection";
import { BalanceHero } from "./sections/BalanceHero";
import { CashflowCard } from "./sections/CashflowCard";
import { CategoryCard } from "./sections/CategoryCard";
import { MonthStats } from "./sections/MonthStats";
import { ProjectionCard } from "./sections/ProjectionCard";
import { QuickEntry } from "./sections/QuickEntry";
import { RecentTransactions } from "./sections/RecentTransactions";
import { UpcomingDue } from "./sections/UpcomingDue";

/**
 * Balance and recent movements show without waiting for the slower agenda and projection.
 * Shared reads are deduplicated per request (React cache).
 */
export function Dashboard() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <StreamBlock height={180}>
          <BalanceHero />
        </StreamBlock>
        <StreamBlock height={180}>
          <MonthStats />
        </StreamBlock>
      </section>

      <StreamBlock height={140}>
        <AccountsSection />
      </StreamBlock>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <StreamBlock height={120}>
          <QuickEntry />
        </StreamBlock>
        <StreamBlock height={280}>
          <UpcomingDue />
        </StreamBlock>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StreamBlock height={320}>
          <CashflowCard />
        </StreamBlock>
        <div className="flex flex-col gap-4">
          <StreamBlock height={320}>
            <ProjectionCard />
          </StreamBlock>
          <StreamBlock height={160}>
            <ReliabilitySection maxSuggestions={3} />
          </StreamBlock>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <StreamBlock height={320}>
          <CategoryCard />
        </StreamBlock>
        <StreamBlock height={320}>
          <RecentTransactions />
        </StreamBlock>
      </section>
    </>
  );
}
