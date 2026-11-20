"use client";

import { Trash2 } from "lucide-react";
import { InlineConfirm } from "@monetio/ui";
import { removeCategoryMatch } from "@/app/actions/category-matches";
import { useToastAction } from "@/hooks/useToastAction";

export interface MatchView {
  id: string;
  description: string;
  direction: 1 | -1;
  categoryName: string;
}

/** Remembered matches of the account, each removable in place. */
export function AccountMatches({ matches }: { matches: MatchView[] }) {
  const { run } = useToastAction();
  if (!matches.length) {
    return <p className="px-4 py-3 text-sm text-ink-muted">Nessun abbinamento: nasce quando assegni una categoria a un movimento senza categoria.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {matches.map((m) => (
        <li key={m.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="break-words">{m.description}</span>
            <span className="text-xs text-ink-muted">
              {m.direction > 0 ? "Entrate" : "Uscite"} · {m.categoryName}
            </span>
          </span>
          <InlineConfirm
            triggerLabel="Rimuovi"
            triggerIcon={<Trash2 />}
            message="Tolgo l'abbinamento? I movimenti già categorizzati restano come sono."
            confirmLabel="Rimuovi"
            onConfirm={() => run(() => removeCategoryMatch(m.id))}
          />
        </li>
      ))}
    </ul>
  );
}
