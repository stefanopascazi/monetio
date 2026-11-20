"use client";

import { useState } from "react";
import { History, Undo2 } from "lucide-react";
import { Accordion, Badge, Button, InlineConfirm } from "@monetio/ui";
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
    <Accordion
      items={[
        {
          id: "history",
          icon: <History />,
          title: "Ultimi aggiornamenti",
          content: (
            <ul className="flex flex-col gap-3 text-xs">
              {batches.map((b) => (
                <li key={b.id} className="flex flex-col gap-2">
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
                  {!b.undoneAt && (
                    <Button variant="ghost" size="sm" className="self-start" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>
                      {open === b.id ? "Nascondi movimenti" : "Vedi movimenti"}
                    </Button>
                  )}
                  {open === b.id && !b.undoneAt && <BankSyncBatchDetails batchId={b.id} />}
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
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
}
