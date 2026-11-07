import { HISTORY_MONTHS, loadProjectionSeries } from "../data";
import { HORIZONS, type Horizon } from "../horizons";
import { ProjectionPanel } from "../ProjectionPanel";

/** Past month-ends and projected balances, per account. */
export async function ProjectionChartSection({ horizon }: { horizon: Horizon }) {
  const series = await loadProjectionSeries(Number(horizon));
  return (
    <ProjectionPanel
      title="Andamento previsto"
      subtitle={`Storico ${HISTORY_MONTHS} mesi e prossimi ${HORIZONS.find((h) => h.value === horizon)!.label}`}
      series={series}
    />
  );
}
