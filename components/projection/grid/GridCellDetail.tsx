import { Amount, Button } from "@monetio/ui";
import type { GridColumn, GridRow } from "@/lib/data/projection-grid";
import { periodLabel } from "./period-label";

/** Inline breakdown of a clicked value, shown under the grid (no dialogs). */
export function GridCellDetail({ title, column, index, rows, onClose }: { title: string; column: GridColumn; index: number; rows: GridRow[]; onClose: () => void }) {
  const shown = rows.filter((r) => r.cells[index].totalCents || r.cells[index].bookedCents);
  return (
    <section aria-label={`Dettaglio ${title}`} className="flex flex-col gap-3 rounded-lg border border-[var(--mio-border)] bg-surface-raised p-4">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {title} · {periodLabel(column)}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Chiudi
        </Button>
      </header>
      {shown.length === 0 ? (
        <p className="text-sm text-ink-muted">Nessun movimento.</p>
      ) : (
        <ul className="flex flex-col text-sm">
          {shown.map((r) => {
            const c = r.cells[index];
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mio-border)] py-2">
                <span>{r.label}</span>
                <span className="flex flex-wrap items-center gap-4">
                  {c.bookedCents !== 0 && c.expectedCents !== 0 && (
                    <>
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        registrato <Amount cents={c.bookedCents} size="sm" showSign />
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        previsto <Amount cents={c.expectedCents} size="sm" showSign />
                      </span>
                    </>
                  )}
                  <Amount cents={c.totalCents} size="sm" showSign className="font-semibold" />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
