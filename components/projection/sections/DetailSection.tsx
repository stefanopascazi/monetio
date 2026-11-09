import { Card } from "@monetio/ui";
import { DETAIL_MONTHS, loadCurrentMonthBooked, loadProjection } from "@/lib/data/agenda";
import { withBookedMonth } from "@/lib/domain/booked-month";
import type { Horizon } from "../horizons";
import { ProjectionDetail } from "../ProjectionDetail";

/** Movements forming each month-end balance: booked and expected for the current month, expected later. */
export async function DetailSection({ horizon }: { horizon: Horizon }) {
  // Booked rows load alongside the projection; only this section waits for them.
  const [{ accounts, projection, details }, booked] = await Promise.all([loadProjection(Number(horizon)), loadCurrentMonthBooked()]);
  return (
    <Card
      title="Cosa entra e cosa esce, mese per mese"
      subtitle={`Mese corrente con i movimenti già registrati, poi solo quelli previsti${projection.length > DETAIL_MONTHS ? `; oltre ${DETAIL_MONTHS} mesi restano solo i saldi` : ""}`}
      padding="none"
    >
      <ProjectionDetail details={withBookedMonth(details, booked.month, booked.rows, booked.categoryNames, Object.fromEntries(accounts.map((a) => [a.id, a.name])))} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </Card>
  );
}
