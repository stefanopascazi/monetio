import { Card } from "@monetio/ui";
import { loadProjection } from "@/lib/data/agenda";
import { SUMMARY_MONTHS } from "@/lib/domain/monthly-summary";
import type { Horizon } from "../horizons";
import { ProjectionBreakdown } from "../ProjectionBreakdown";

/** Typical month built from rules, estimates and quotas. */
export async function BreakdownSection({ horizon }: { horizon: Horizon }) {
  const { accounts, summary } = await loadProjection(Number(horizon));
  return (
    <Card title="Come si forma un mese tipo" subtitle={`Media mensile dei prossimi ${SUMMARY_MONTHS} mesi da ricorrenze, stime e quote, secondo le loro date`} padding="none">
      <ProjectionBreakdown accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} summary={summary} />
    </Card>
  );
}
