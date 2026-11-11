"use client";

import { Amount, Badge, Card, InlineConfirm } from "@monetio/ui";
import { FileSpreadsheet, Undo2 } from "lucide-react";
import { undoImport } from "@/app/actions/import";
import { useToastAction } from "@/hooks/useToastAction";
import type { BatchView } from "./history-view";

/** Imports, newest first; active ones can be undone in place. */
export function ImportBatchList({ items }: { items: BatchView[] }) {
  const { pending, run } = useToastAction();
  return (
    <Card padding="none">
      <ul className="divide-y divide-border">
        {items.map((b) => (
          <li key={b.id} className={`flex flex-col gap-3 p-4 ${b.undone ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-2">
                  <FileSpreadsheet className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate font-semibold">{b.fileName}</span>
                  {b.bank && <Badge size="sm">{b.bank}</Badge>}
                </span>
                <span className="text-sm text-ink-muted">
                  {b.accountName} · importato il {b.importedOn}
                </span>
                {b.period && <span className="text-sm text-ink-muted">Movimenti {b.period}</span>}
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Amount cents={b.totalCents} showSign />
                <span className="text-xs text-ink-muted">{b.rowCount === 1 ? "1 movimento" : `${b.rowCount} movimenti`}</span>
              </span>
            </div>
            {b.undone ? (
              <Badge size="sm" className="w-fit">
                Annullato il {b.undoneOn}
              </Badge>
            ) : (
              <InlineConfirm
                className="w-fit"
                triggerLabel={pending ? "Annullamento…" : "Annulla import"}
                triggerIcon={<Undo2 />}
                message={`Eliminare i ${b.rowCount} movimenti di questo import? Vengono eliminati anche se li hai modificati dopo.`}
                confirmLabel="Annulla import"
                cancelLabel="Lascia com'è"
                onConfirm={() => run(() => undoImport(b.id))}
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
