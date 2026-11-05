import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Amount } from "@monetio/ui";
import type { PendingTransfers } from "@/lib/data/pending-transfers";

/** "Giroconti da fare" summary shown under an account. Renders nothing when there are none. */
export function PendingTransfersNote({ pending }: { pending?: PendingTransfers }) {
  if (!pending || (!pending.outCents && !pending.inCents)) return null;
  return (
    <span className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink-muted">Giroconti da fare entro fine mese</span>
      <span className="flex flex-wrap gap-x-4 gap-y-1">
        {pending.outCents > 0 && (
          <span className="inline-flex items-center gap-1">
            <ArrowUpRight className="size-4 text-expense" aria-label="In uscita" />
            <Amount cents={-pending.outCents} tone="expense" size="sm" />
          </span>
        )}
        {pending.inCents > 0 && (
          <span className="inline-flex items-center gap-1">
            <ArrowDownLeft className="size-4 text-income" aria-label="In entrata" />
            <Amount cents={pending.inCents} tone="income" size="sm" showSign />
          </span>
        )}
      </span>
    </span>
  );
}
