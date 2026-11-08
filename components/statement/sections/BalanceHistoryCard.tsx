import { ProjectionChart } from "@monetio/ui";
import { MobileFoldCard } from "@/components/common/MobileFoldCard";
import { yearBalancePoints } from "@/lib/data/history";
import { listMonthlyBalances } from "@/lib/data/queries";

/** Month-end balances of the account in the selected year (hidden with fewer than two points). */
export async function BalanceHistoryCard({ accountId, accountName, year }: { accountId: string; accountName: string; year: number }) {
  const history = yearBalancePoints(await listMonthlyBalances(`${year}-01-01`), accountId, year);
  if (history.length < 2) return null;
  return (
    <MobileFoldCard title="Andamento saldo" subtitle={`Fine mese, ${year}`}>
      <ProjectionChart data={history} title={`Saldo ${accountName}`} />
    </MobileFoldCard>
  );
}
