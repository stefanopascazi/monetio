import { Card } from "@monetio/ui";
import { PeriodNav } from "@/components/common/PeriodNav";
import { withQuery } from "@/lib/data/params";
import { adjacentMonths, periodLabel, type StatementPeriod } from "@/lib/data/statement-period";
import { loadStatementRows } from "@/lib/data/statement-rows";
import { toTxnView } from "@/lib/data/views";
import { monthKey } from "@/lib/domain/dates";
import { loadStatementRefs } from "../data";
import { StatementFilters } from "../StatementFilters";
import { StatementMonths } from "../StatementMonths";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

/** Booked rows of the period with running balance, filters and month navigation. */
export async function StatementCard({ accountId, openingDate, period, today }: { accountId: string; openingDate: string; period: StatementPeriod; today: string }) {
  const [{ accounts, categories, members, refs, catRefs }, { rows, openingCents }] = await Promise.all([loadStatementRefs(), loadStatementRows(accountId, period)]);
  const views = new Map(rows.map((r) => [r.id, toTxnView(r, accounts, categories, members)]));
  const basePath = `/conti/${accountId}`;
  const label = periodLabel(period);
  const nav = period.kind === "month" ? adjacentMonths(period.month, monthKey(openingDate), monthKey(today)) : null;
  return (
    <Card
      title="Estratto conto"
      subtitle={openingCents === null ? label : `${label} · saldo iniziale ${eur.format(openingCents / 100)}`}
      action={
        nav && (
          <PeriodNav
            label={label}
            prevHref={nav.prev ? withQuery(basePath, { mese: nav.prev }) : null}
            nextHref={nav.next ? withQuery(basePath, { mese: nav.next }) : null}
          />
        )
      }
      padding="none"
    >
      <StatementFilters basePath={basePath} period={period} />
      <StatementMonths rows={rows} views={views} accounts={refs} categories={catRefs} emptyTitle={period.kind === "recent" ? "Nessun movimento" : `Nessun movimento: ${label.toLowerCase()}`} />
    </Card>
  );
}
