"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { Amount } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { type GridCell, type GridRow, projectionGrid } from "@/lib/data/projection-grid";
import type { ProjectionDetailMonth } from "@/lib/domain/projection-details";
import { BALANCES_CLASS } from "@/lib/privacy/balance-privacy";
import { visibleAccounts } from "../account/account-filter";
import { useProjectionAccount } from "../account/ProjectionAccountContext";
import { GridCellDetail } from "./GridCellDetail";
import { GridValue } from "./GridValue";
import { periodLabel } from "./period-label";

const STICKY_COL = "sticky left-0 z-10 bg-surface-raised";
// Opaque tint: pinned rows must hide the cells scrolling under them.
const CURRENT = "bg-[color-mix(in_srgb,var(--mio-brand)_8%,var(--mio-surface-raised))]";

interface Picked {
  title: string;
  index: number;
  rows: GridRow[];
}

function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className="flex items-center gap-1.5 text-left">
      <Icon size={16} aria-hidden="true" />
      {children}
    </button>
  );
}

/**
 * Spreadsheet view: periods as columns, income/expense rows folded by default.
 * Header with opening balance and footer with net and month-end balance stay pinned while scrolling.
 */
export function ProjectionGridTable({
  periods,
  accounts,
  categoryNames,
  currentMonth,
}: {
  periods: (ProjectionDetailMonth & { months?: number })[];
  accounts: NamedRef[];
  categoryNames: Record<string, string>;
  currentMonth: string;
}) {
  const { selected } = useProjectionAccount();
  const grid = useMemo(
    () =>
      projectionGrid(
        periods,
        visibleAccounts(accounts, selected).map((a) => a.id),
        categoryNames,
        currentMonth,
      ),
    [periods, accounts, selected, categoryNames, currentMonth],
  );
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Picked | null>(null);
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const { columns } = grid;
  const cur = (i: number) => (columns[i].current ? CURRENT : "");
  const pinned = (i: number) => (columns[i].current ? CURRENT : "bg-surface-raised");

  const values = (cells: GridCell[], title: string, rows: GridRow[], strong?: boolean) =>
    cells.map((c, i) => (
      <td key={columns[i].key} className={`border-t border-[var(--mio-border)] px-2 py-1 text-right ${cur(i)}`}>
        <button
          type="button"
          className="w-full rounded px-2 py-0.5 text-right hover:bg-surface-sunken"
          onClick={() => setPicked({ title, index: i, rows })}
          aria-label={`Dettaglio ${title}, ${periodLabel(columns[i])}`}
        >
          <GridValue cell={c} current={columns[i].current} strong={strong} />
        </button>
      </td>
    ));

  const balances = (label: string, cents: number[], tone: "plain" | "net" | "closing") => (
    <tr className={BALANCES_CLASS}>
      <th
        scope="row"
        className={`${STICKY_COL} px-4 py-2 text-left ${tone === "closing" ? "border-t-2 border-brand font-semibold text-ink" : "border-t border-[var(--mio-border)] font-medium text-ink-muted"}`}
      >
        {label}
      </th>
      {cents.map((v, i) => (
        <td
          key={columns[i].key}
          className={`px-4 py-2 text-right ${tone === "closing" ? "border-t-2 border-brand" : "border-t border-[var(--mio-border)]"} ${pinned(i)}`}
        >
          {tone === "net" ? (
            <Amount cents={v} size="sm" showSign />
          ) : (
            <Amount cents={v} tone={v < 0 ? "expense" : "neutral"} size={tone === "closing" ? "md" : "sm"} className={tone === "closing" ? "font-semibold" : undefined} />
          )}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-[var(--mio-border)] bg-surface-raised">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-surface-raised">
            <tr>
              <th scope="col" className={`${STICKY_COL} z-30 min-w-[240px] px-4 py-2.5 text-left font-medium text-ink-muted`}>
                Voce
              </th>
              {columns.map((c, i) => (
                <th key={c.key} scope="col" className={`min-w-[120px] px-4 py-2.5 text-right font-semibold ${c.key.length > 4 ? "capitalize" : ""} ${pinned(i)}`}>
                  {periodLabel(c)}
                  {c.current && <span className="block text-[11px] font-normal normal-case text-ink-muted">in corso</span>}
                </th>
              ))}
            </tr>
            {balances("Saldo iniziale", grid.openingCents, "plain")}
          </thead>
          <tbody>
            {grid.groups.map((g) => {
              const gOpen = open.has(g.id);
              return (
                <Fragment key={g.id}>
                  <tr className="bg-surface">
                    <th scope="row" className={`${STICKY_COL} border-t border-[var(--mio-border)] bg-surface px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide`}>
                      <Toggle open={gOpen} onClick={() => toggle(g.id)}>
                        {g.label}
                      </Toggle>
                    </th>
                    {values(g.cells, g.label, g.categories, true)}
                  </tr>
                  {gOpen &&
                    g.categories.map((cat) => {
                      const cOpen = open.has(cat.id);
                      return (
                        <Fragment key={cat.id}>
                          <tr>
                            <th scope="row" className={`${STICKY_COL} border-t border-[var(--mio-border)] py-1.5 pr-4 pl-8 text-left font-medium`}>
                              <Toggle open={cOpen} onClick={() => toggle(cat.id)}>
                                {cat.label}
                              </Toggle>
                            </th>
                            {values(cat.cells, cat.label, cat.lines)}
                          </tr>
                          {cOpen &&
                            cat.lines.map((l) => (
                              <tr key={l.id} className="text-ink-muted">
                                <th scope="row" className={`${STICKY_COL} border-t border-[var(--mio-border)] py-1.5 pr-4 pl-[60px] text-left font-normal`}>
                                  {l.label}
                                </th>
                                {values(l.cells, l.label, [l])}
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-surface-raised">
            {balances("Variazione", grid.netCents, "net")}
            {balances("Saldo a fine periodo", grid.closingCents, "closing")}
          </tfoot>
        </table>
      </div>
      {picked && <GridCellDetail title={picked.title} column={columns[picked.index]} index={picked.index} rows={picked.rows} onClose={() => setPicked(null)} />}
    </div>
  );
}
