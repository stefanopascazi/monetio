"use client";

import { Amount, Button } from "@monetio/ui";
import type { SelectionSummary } from "./import-view";

export interface ImportActionBarProps {
  summary: SelectionSummary | null;
  checking: boolean;
  importing: boolean;
  onConfirm: () => void;
}

/**
 * Confirm bar pinned to the bottom of the preview column, so long files never hide the button.
 * On phones it sits above the floating bottom nav.
 */
export function ImportActionBar({ summary, checking, importing, onConfirm }: ImportActionBarProps) {
  const count = summary?.count ?? 0;
  return (
    <div className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-10 flex items-center justify-between gap-3 rounded-[22px] bg-surface-raised p-3 shadow-lg min-[960px]:bottom-6">
      <span className="flex min-w-0 flex-col text-sm">
        <span className="font-semibold">{checking ? "Controllo in corso…" : `${count} da importare`}</span>
        {summary && count > 0 && <Amount cents={summary.totalCents} size="sm" showSign />}
      </span>
      <Button loading={importing} disabled={!summary || count === 0 || checking} onClick={onConfirm}>
        {count === 1 ? "Importa 1 movimento" : `Importa ${count} movimenti`}
      </Button>
    </div>
  );
}
