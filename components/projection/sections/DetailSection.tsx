import { DETAIL_MONTHS, loadCurrentMonthBooked, loadFullDetails, loadProjection } from "@/lib/data/agenda";
import { withBookedMonth } from "@/lib/domain/booked-month";
import type { ProjectionDetailMonth } from "@/lib/domain/projection-details";
import { yearlyDetails } from "@/lib/domain/projection-yearly";
import { DetailViews } from "../DetailViews";
import type { Horizon } from "../horizons";

/** Movements forming each month-end balance: booked and expected for the current month, expected later. */
export async function DetailSection({ horizon }: { horizon: Horizon }) {
  const months = Number(horizon);
  const long = months > DETAIL_MONTHS;
  // Booked rows (and, for long horizons, the full detail) load alongside the projection; only this section waits for them.
  const [{ accounts, projection, details }, booked, full] = await Promise.all([loadProjection(months), loadCurrentMonthBooked(), long ? loadFullDetails(months) : null]);
  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const withBooked = (d: ProjectionDetailMonth[]) => withBookedMonth(d, booked.month, booked.rows, booked.categoryNames, accountNames);
  const listDetails = withBooked(details);
  return (
    <DetailViews
      listDetails={listDetails}
      // Long horizons: one grid column per calendar year over the whole horizon.
      gridPeriods={full ? yearlyDetails(withBooked(full)) : listDetails}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categoryNames={booked.categoryNames}
      currentMonth={booked.month}
      listNote={projection.length > DETAIL_MONTHS ? `; oltre ${DETAIL_MONTHS} mesi restano solo i saldi` : undefined}
    />
  );
}
