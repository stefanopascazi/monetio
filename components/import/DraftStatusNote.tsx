"use client";

import { Badge } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { DraftStatus } from "@/lib/import/classify";

export interface DraftStatusNoteProps {
  status: DraftStatus | undefined;
  /** Giroconti only: whether the row will be linked to the other account. */
  linked?: boolean;
  onLinkChange?: (linked: boolean) => void;
  /** Giroconti only: the row is selected for import (the link choice is offered only then). */
  selected?: boolean;
}

const VIA_LABEL = { iban: "Riconosciuto dall'IBAN", card: "Riconosciuto dalla carta" } as const;

/** Why a draft is excluded, flagged or paired with another account. */
export function DraftStatusNote({ status, linked = false, onLinkChange, selected = false }: DraftStatusNoteProps) {
  if (!status || status.kind === "new") return null;
  if (status.kind === "duplicate") return <Badge size="sm">Già presente</Badge>;
  if (status.kind === "beforeOpening") return <Badge size="sm">Prima dell&apos;apertura</Badge>;
  if (status.kind === "possible") {
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
  const via = status.via ? VIA_LABEL[status.via] : "";
  const detail =
    status.kind === "transfer"
      ? `Altro lato: “${status.match.description}” del ${dateLabel(status.match.bookedOn)}`
      : `L'altro lato non è ancora registrato: verrà creato`;
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge size="sm" tone="transfer">
        Giroconto con {status.kind === "transfer" ? status.match.accountName : status.account.name}
      </Badge>
      <span className="text-xs text-ink-muted">
        {via ? `${via}. ` : ""}
        {detail}
      </span>
      {selected && (
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <input type="checkbox" className="size-4 accent-brand" checked={linked} onChange={(e) => onLinkChange?.(e.target.checked)} />
          Collega come giroconto
        </label>
      )}
    </span>
  );
}
