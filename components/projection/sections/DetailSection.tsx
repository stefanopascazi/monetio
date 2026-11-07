import { Card } from "@monetio/ui";
import { DETAIL_MONTHS, loadProjection } from "@/lib/data/agenda";
import type { Horizon } from "../horizons";
import { ProjectionDetail } from "../ProjectionDetail";

/** Projected movements forming each month-end balance. */
export async function DetailSection({ horizon }: { horizon: Horizon }) {
  const { accounts, projection, details } = await loadProjection(Number(horizon));
  return (
    <Card
      title="Cosa entra e cosa esce, mese per mese"
      subtitle={projection.length > DETAIL_MONTHS ? `Primi ${DETAIL_MONTHS} mesi; oltre restano solo i saldi` : "Movimenti previsti che formano ogni saldo"}
      padding="none"
    >
      <ProjectionDetail details={details} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </Card>
  );
}
