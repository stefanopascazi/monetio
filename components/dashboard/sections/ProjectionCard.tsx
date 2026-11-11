import { ProjectionPanel } from "@/components/projection/ProjectionPanel";
import { loadProjection } from "@/lib/data/agenda";
import { projectionPoints } from "@/lib/data/history";
import { loadReliability } from "@/lib/data/reliability";
import { combinedUncertainty } from "@/lib/domain/reliability";

/** Total balance projected over the next 12 months. */
export async function ProjectionCard() {
  const [{ projection, accounts }, { bands }] = await Promise.all([loadProjection(12), loadReliability()]);
  const ids = accounts.map((a) => a.id);
  return (
    <ProjectionPanel
      title="Dove stiamo andando"
      subtitle="Prossimi 12 mesi da ricorrenze e quote"
      series={[{ id: "all", name: "tutti i conti", points: projectionPoints([], projection, (p) => p.totalCents, (n) => combinedUncertainty(bands, ids, n)) }]}
    />
  );
}
