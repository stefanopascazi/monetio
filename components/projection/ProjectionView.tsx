import { Card, PageHeader } from "@monetio/ui";
import { loadProjection } from "@/lib/data/agenda";
import { balanceHistory, lastMonths, projectionPoints } from "@/lib/data/history";
import { listMonthlyBalances } from "@/lib/data/queries";
import { addMonthsToKey, monthKey, monthLabel, startOfMonth } from "@/lib/domain/dates";
import { HORIZONS, HorizonSwitch, ProjectionPanel } from "./ProjectionPanel";
import { ProjectionTable } from "./ProjectionTable";

const HISTORY_MONTHS = 6;

export async function ProjectionView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.mesi) ? sp.mesi[0] : sp.mesi;
  const horizon = HORIZONS.find((h) => h.value === raw)?.value ?? "12";
  const { today, accounts, projection } = await loadProjection(Number(horizon));
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
        description="Saldi previsti a fine mese da ricorrenze, scadenze, quote e movimenti pianificati."
        actions={<HorizonSwitch value={horizon} />}
      />
      <ProjectionPanel title="Andamento previsto" subtitle={`Storico ${HISTORY_MONTHS} mesi e prossimi ${HORIZONS.find((h) => h.value === horizon)!.label}`} series={[all, ...perAccount]} />
      <Card title="Dettaglio per conto" subtitle={`Saldo a fine mese fino a ${monthLabel(projection.at(-1)!.month, true)}`} padding="none">
        <ProjectionTable projection={projection} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
      </Card>
    </>
  );
}
