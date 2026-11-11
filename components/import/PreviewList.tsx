"use client";

import { useState } from "react";
import { Amount, Badge, Button, Card } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { DraftStatus } from "@/lib/import/classify";
import type { ImportDraft, SkippedRow } from "@/lib/import/types";
import { isSelectable, isSelected } from "./import-view";

export interface PreviewListProps {
  drafts: ImportDraft[];
  statuses: DraftStatus[] | null;
  choices: ReadonlyMap<number, boolean>;
  onToggle: (line: number, value: boolean) => void;
  skipped: SkippedRow[];
}

const PAGE = 100;

function StatusNote({ status }: { status: DraftStatus | undefined }) {
  if (!status || status.kind === "new") return null;
  if (status.kind === "duplicate") return <Badge size="sm">Già presente</Badge>;
  if (status.kind === "beforeOpening") return <Badge size="sm">Prima dell&apos;apertura</Badge>;
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge size="sm" tone="warning">
        Forse già presente
      </Badge>
      <span className="text-xs text-ink-muted">
        Simile a “{status.match.description}” del {dateLabel(status.match.bookedOn)}
      </span>
    </span>
  );
}

/** Movements found in the file, with a checkbox for those that can be imported. */
export function PreviewList({ drafts, statuses, choices, onToggle, skipped }: PreviewListProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? drafts : drafts.slice(0, PAGE);
  return (
    <>
      <Card title="Movimenti nel file" subtitle={statuses ? `${drafts.length} righe lette` : "Controllo dei movimenti già presenti…"} padding="none">
        <ul className="divide-y divide-border">
          {visible.map((d, i) => {
            const status = statuses?.[i];
            const selectable = isSelectable(status);
            return (
              <li key={d.line}>
                <label className={`flex items-start gap-3 px-4 py-3 ${selectable ? "cursor-pointer" : "opacity-60"}`}>
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-brand"
                    disabled={!selectable}
                    checked={isSelected(d.line, status, choices)}
                    onChange={(e) => onToggle(d.line, e.target.checked)}
                    aria-label={`Importa ${d.description} del ${dateLabel(d.bookedOn)}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-semibold">{d.description}</span>
                    <span className="text-xs text-ink-muted">
                      {dateLabel(d.bookedOn)}
                      {d.category ? ` · ${d.category}` : ""}
                    </span>
                    <StatusNote status={status} />
                  </span>
                  <Amount cents={d.amountCents} showSign />
                </label>
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
