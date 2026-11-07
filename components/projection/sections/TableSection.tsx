import { Card } from "@monetio/ui";
import { loadProjection } from "@/lib/data/agenda";
import { monthLabel } from "@/lib/domain/dates";
import type { Horizon } from "../horizons";
import { ProjectionTable } from "../ProjectionTable";

/** Month-end balance per account over the horizon. */
export async function TableSection({ horizon }: { horizon: Horizon }) {
  const { accounts, projection } = await loadProjection(Number(horizon));
  return (
    <Card title="Dettaglio per conto" subtitle={`Saldo a fine mese fino a ${monthLabel(projection.at(-1)!.month, true)}`} padding="none">
      <ProjectionTable projection={projection} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </Card>
  );
}
