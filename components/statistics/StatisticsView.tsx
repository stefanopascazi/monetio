import { StreamBlock } from "@/components/common/StreamBlock";
import { loadStatisticsAccounts } from "./data";
import { accountParam, periodParam } from "./params";
import { StatisticsContent } from "./StatisticsContent";
import { StatisticsFilters } from "./StatisticsFilters";

/** Where the money went: booked data only, filtered by account and period. */
export async function StatisticsView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, accounts] = await Promise.all([searchParams, loadStatisticsAccounts()]);
  const period = periodParam(params.mesi);
  const accountId = accountParam(
    params.conto,
    accounts.map((a) => a.id),
  );
  return (
    <>
      <StatisticsFilters accounts={accounts} accountId={accountId} period={period} />
      <StreamBlock height={480}>
        <StatisticsContent accountId={accountId} months={Number(period)} />
      </StreamBlock>
    </>
  );
}
