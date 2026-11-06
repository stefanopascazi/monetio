import { Card, PageHeader } from "@monetio/ui";
import { DETAIL_MONTHS, loadProjection } from "@/lib/data/agenda";
import { balanceHistory, lastMonths, projectionPoints } from "@/lib/data/history";
import { listCategories, listMonthlyBalances } from "@/lib/data/queries";
import { addMonthsToKey, monthKey, monthLabel, startOfMonth } from "@/lib/domain/dates";
import { HORIZONS, horizonParam } from "./horizons";
import { HorizonSwitch, ProjectionPanel } from "./ProjectionPanel";
import { ProjectionBreakdown } from "./ProjectionBreakdown";
import { ProjectionDetail } from "./ProjectionDetail";
import { ProjectionTable } from "./ProjectionTable";

const HISTORY_MONTHS = 6;

export async function ProjectionView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const horizon = horizonParam(sp.mesi);
  const { today, accounts, projection, details, baseline, baselineMonths, summary } = await loadProjection(Number(horizon));
  const categories = await listCategories();
  const current = monthKey(today);
  // History: the months before the current one, month-end balances.
  const months = lastMonths(addMonthsToKey(current, -1), HISTORY_MONTHS);
  const balances = await listMonthlyBalances(startOfMonth(addMonthsToKey(months[0], -24)));
  const openingBefore: Record<string, number> = {};
  for (const b of balances) if (b.month < months[0]) openingBefore[b.accountId] = b.balanceCents;
  for (const a of accounts) if (openingBefore[a.id] === undefined && a.openingDate < startOfMonth(months[0])) openingBefore[a.id] = a.openingBalanceCents;

  const series = (ids: string[], id: string, name: string) => {
    const hist = balanceHistory(balances, ids, months, openingBefore);
    return {
      id,
      name,
      points: projectionPoints(
        months.map((m, i) => ({ month: m, valueCents: hist[i] })),
        projection,
        (p) => ids.reduce((s, x) => s + (p.byAccount[x] ?? 0), 0),
      ),
    };
  };
  const all = series(
    accounts.map((a) => a.id),
    "all",
    "tutti i conti",
  );
  const perAccount = accounts.map((a) => series([a.id], a.id, a.name));

  return (
    <>
      <PageHeader
        title="Proiezioni"
        description="Saldi previsti a fine mese: ricorrenze, scadenze, quote, movimenti pianificati e medie dello storico per tutto il resto."
        actions={<HorizonSwitch value={horizon} />}
      />
      <ProjectionPanel title="Andamento previsto" subtitle={`Storico ${HISTORY_MONTHS} mesi e prossimi ${HORIZONS.find((h) => h.value === horizon)!.label}`} series={[all, ...perAccount]} />
      <Card
        title="Come si forma un mese tipo"
        subtitle={`Medie su ${monthLabel(baselineMonths[0], true)} – ${monthLabel(baselineMonths.at(-1)!, true)}, al netto di ricorrenze e stime; entrate occasionali escluse`}
        padding="none"
      >
        <ProjectionBreakdown
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          summary={summary}
          baseline={baseline}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Card>
      <Card
        title="Cosa entra e cosa esce, mese per mese"
        subtitle={projection.length > DETAIL_MONTHS ? `Primi ${DETAIL_MONTHS} mesi; oltre restano solo i saldi` : "Movimenti previsti che formano ogni saldo"}
        padding="none"
      >
        <ProjectionDetail details={details} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
      </Card>
      <Card title="Dettaglio per conto" subtitle={`Saldo a fine mese fino a ${monthLabel(projection.at(-1)!.month, true)}`} padding="none">
        <ProjectionTable projection={projection} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
      </Card>
    </>
  );
}
