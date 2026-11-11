import { loadReliability } from "@/lib/data/reliability";
import { HISTORY_MONTHS, loadProjectionSeries } from "../data";
import { HORIZONS, type Horizon } from "../horizons";
import { ProjectionPanel } from "../ProjectionPanel";

/** Past month-ends and projected balances, per account. */
export async function ProjectionChartSection({ horizon }: { horizon: Horizon }) {
  const [series, reliability] = await Promise.all([loadProjectionSeries(Number(horizon)), loadReliability()]);
  return (
    <ProjectionPanel
      title="Andamento previsto"
      subtitle={`Storico ${HISTORY_MONTHS} mesi e prossimi ${HORIZONS.find((h) => h.value === horizon)!.label}`}
      series={series}
      reliability={reliability}
    />
  );
}
