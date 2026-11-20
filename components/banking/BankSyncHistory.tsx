"use client";

import { useState } from "react";
import { History, Undo2 } from "lucide-react";
import { Badge, Button, InlineConfirm } from "@monetio/ui";
import { undoBankSync } from "@/app/actions/bank-sync-batches";
import { useToastAction } from "@/hooks/useToastAction";
import { BankSyncBatchDetails } from "./BankSyncBatchDetails";
import { BATCH_KIND_LABEL, batchSummary, type BankSyncBatch, undoableBatchId, undoMessage } from "@/lib/banking/sync-batches";

const timeFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Latest syncs of a bank-fed account; the newest active one can be undone. */
export function BankSyncHistory({ batches }: { batches: BankSyncBatch[] }) {
  const { run } = useToastAction();
  const [open, setOpen] = useState<string | null>(null);
  if (!batches.length) return null;
  const undoable = undoableBatchId(batches);
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4" aria-label="Ultimi aggiornamenti">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-ink-muted" aria-hidden="true" />
        Ultimi aggiornamenti
      </h4>
      <ul className="flex flex-col divide-y divide-border text-xs">
        {batches.map((b) => (
          <li key={b.id} className="flex flex-col gap-2 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{BATCH_KIND_LABEL[b.kind]}</span>
              <span className="text-ink-muted">{timeFormat.format(new Date(b.createdAt))}</span>
              {b.undoneAt && (
                <Badge tone="neutral" size="sm">
                  Annullato
                </Badge>
              )}
            </div>
            <span className="text-ink-muted">{batchSummary(b)}</span>
            {open === b.id && !b.undoneAt && <BankSyncBatchDetails batchId={b.id} />}
            {!b.undoneAt && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>
                  {open === b.id ? "Nascondi movimenti" : "Vedi movimenti"}
                </Button>
                {b.id === undoable && (
                  <InlineConfirm
                    triggerLabel="Annulla aggiornamento"
                    triggerIcon={<Undo2 />}
                    message={undoMessage(b.kind)}
                    confirmLabel="Sì, annulla"
                    cancelLabel="Lascia"
                    onConfirm={() => run(() => undoBankSync(b.id))}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
