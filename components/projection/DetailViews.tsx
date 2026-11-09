"use client";

import { Card, SegmentedControl } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import type { ProjectionDetailMonth } from "@/lib/domain/projection-details";
import type { DetailViewMode } from "./grid/view-mode";
import { ProjectionGridTable } from "./grid/ProjectionGridTable";
import { useViewMode } from "./grid/use-view-mode";
import { ProjectionDetail } from "./ProjectionDetail";

const MODES: { value: DetailViewMode; label: string }[] = [
  { value: "list", label: "Elenco" },
  { value: "grid", label: "Griglia" },
];

/** Monthly detail as a vertical list (always on phones) or, on desktop by choice, as a spreadsheet grid. */
export function DetailViews({
  listDetails,
  gridPeriods,
  accounts,
  categoryNames,
  currentMonth,
  listNote,
}: {
  listDetails: ProjectionDetailMonth[];
  gridPeriods: (ProjectionDetailMonth & { months?: number })[];
  accounts: NamedRef[];
  categoryNames: Record<string, string>;
  currentMonth: string;
  /** Extra subtitle for the list (e.g. months beyond the detail limit). */
  listNote?: string;
}) {
  const [mode, setMode] = useViewMode();
  const grid = mode === "grid";
  return (
    <Card
      title="Cosa entra e cosa esce, mese per mese"
      subtitle={
        <>
          <span className={grid ? "lg:hidden" : undefined}>Mese corrente con i movimenti già registrati, poi solo quelli previsti{listNote}</span>
          {grid && <span className="hidden lg:inline">Tutti i periodi affiancati, mese corrente con i movimenti già registrati. Clic su un valore per il dettaglio.</span>}
        </>
      }
      action={
        <div className="hidden lg:block">
          <SegmentedControl<DetailViewMode> aria-label="Visualizzazione" size="sm" value={mode} onChange={setMode} options={MODES} />
        </div>
      }
      padding="none"
    >
      <div className={grid ? "lg:hidden" : undefined}>
        <ProjectionDetail details={listDetails} accounts={accounts} />
      </div>
      {grid && (
        <div className="hidden px-5 pb-5 lg:block">
          <ProjectionGridTable periods={gridPeriods} accounts={accounts} categoryNames={categoryNames} currentMonth={currentMonth} />
        </div>
      )}
    </Card>
  );
}
