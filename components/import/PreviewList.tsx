"use client";

import { useState } from "react";
import { Amount, Button, Card } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { DraftStatus } from "@/lib/import/classify";
import type { ImportDraft, SkippedRow } from "@/lib/import/types";
import { DraftStatusNote } from "./DraftStatusNote";
import { type CategoryOption, effectiveCategory, isLinked, isSelectable, isSelected } from "./import-view";
import { RowCategory } from "./RowCategory";

export interface PreviewListProps {
  drafts: ImportDraft[];
  statuses: DraftStatus[] | null;
  choices: ReadonlyMap<number, boolean>;
  onToggle: (line: number, value: boolean) => void;
  unlinked: ReadonlySet<number>;
  onToggleLink: (line: number, linked: boolean) => void;
  categories: CategoryOption[];
  picks: ReadonlyMap<number, string>;
  suggestions: ReadonlyMap<number, string>;
  onPickCategory: (line: number, categoryId: string) => void;
  skipped: SkippedRow[];
}

const PAGE = 100;

/** Movements found in the file, with a checkbox for those that can be imported. */
export function PreviewList({ drafts, statuses, choices, onToggle, unlinked, onToggleLink, categories, picks, suggestions, onPickCategory, skipped }: PreviewListProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? drafts : drafts.slice(0, PAGE);
  return (
    <>
      <Card title="Movimenti nel file" subtitle={statuses ? `${drafts.length} righe lette` : "Controllo dei movimenti già presenti…"} padding="none">
        <ul className="divide-y divide-border">
          {visible.map((d, i) => {
            const status = statuses?.[i];
            const selectable = isSelectable(status);
            const selected = isSelected(d.line, status, choices);
            return (
              <li key={d.line} className={`flex items-start gap-3 px-4 py-3 ${selectable ? "" : "opacity-60"}`}>
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-brand"
                  disabled={!selectable}
                  checked={selected}
                  onChange={(e) => onToggle(d.line, e.target.checked)}
                  aria-label={`Importa ${d.description} del ${dateLabel(d.bookedOn)}`}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">{d.description}</span>
                  <span className="text-xs text-ink-muted">
                    {dateLabel(d.bookedOn)}
                    {d.category ? ` · ${d.category}` : ""}
                  </span>
                  {selected && (
                    <RowCategory
                      amountCents={d.amountCents}
                      value={effectiveCategory(d.line, picks, suggestions)}
                      suggested={!picks.has(d.line) && suggestions.has(d.line)}
                      categories={categories}
                      onChange={(id) => onPickCategory(d.line, id)}
                      label={`Categoria di ${d.description}`}
                    />
                  )}
                  <DraftStatusNote status={status} selected={selected} linked={isLinked(d.line, status, choices, unlinked)} onLinkChange={(v) => onToggleLink(d.line, v)} />
                </span>
                <Amount cents={d.amountCents} tone={isLinked(d.line, status, choices, unlinked) ? "transfer" : "auto"} showSign />
              </li>
            );
          })}
        </ul>
        {drafts.length > PAGE && !showAll && (
          <div className="p-3">
            <Button variant="ghost" block onClick={() => setShowAll(true)}>
              Mostra tutti ({drafts.length})
            </Button>
          </div>
        )}
      </Card>
      {skipped.length > 0 && (
        <Card title={`Righe scartate (${skipped.length})`} subtitle="Righe senza data o importo validi, o escluse dal formato della banca." collapsible defaultOpen={false}>
          <ul className="flex flex-col gap-1 text-sm">
            {skipped.map((s) => (
              <li key={s.line}>
                <span className="font-semibold">Riga {s.line}</span>: {s.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
