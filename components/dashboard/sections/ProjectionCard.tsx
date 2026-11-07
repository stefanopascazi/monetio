import { ProjectionPanel } from "@/components/projection/ProjectionPanel";
import { loadProjection } from "@/lib/data/agenda";
import { projectionPoints } from "@/lib/data/history";

/** Total balance projected over the next 12 months. */
export async function ProjectionCard() {
  const { projection } = await loadProjection(12);
  return (
    <ProjectionPanel
      title="Dove stiamo andando"
      subtitle="Prossimi 12 mesi da ricorrenze e quote"
      series={[{ id: "all", name: "tutti i conti", points: projectionPoints([], projection, (p) => p.totalCents) }]}
    />
  );
}
