"use client";

import { ChevronDown, ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { cx } from "@monetio/ui";
import { LEVEL_LABEL, type ReliabilityLevel } from "@/lib/domain/reliability";
import { type ReliabilityData, reliabilityFor } from "./reliability-view";

const TINT: Record<ReliabilityLevel, string> = {
  high: "bg-success-soft text-success",
  medium: "bg-warning-soft text-warning",
  low: "bg-danger-soft text-danger",
};

const MEANING: Record<ReliabilityLevel, string> = {
  high: "I dati sono completi e aggiornati.",
  medium: "Alcuni dati mancano o sono vecchi: prendila con cautela.",
  low: "Mancano molti dati: può sbagliare di parecchio.",
};

/**
 * How far the projection can be trusted, shown as a tinted strip above the chart; when there is
 * something to fix it opens, inline, the actions that bring the forecast closer to reality.
 */
export function ReliabilityNote({ data, seriesId }: { data: ReliabilityData; seriesId: string }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { level, score, suggestions } = reliabilityFor(data, seriesId);
  const expandable = suggestions.length > 0;
  const Icon = level === "high" ? ShieldCheck : ShieldAlert;
  const head = (
    <>
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex min-w-0 flex-col text-left">
        <span className="text-sm font-semibold text-ink">
          Affidabilità {LEVEL_LABEL[level].toLowerCase()} · {score}/100
        </span>
        <span className="text-xs text-ink-muted">
          {MEANING[level]}
          {expandable && ` ${suggestions.length === 1 ? "1 cosa da sistemare" : `${suggestions.length} cose da sistemare`}.`}
        </span>
      </span>
    </>
  );

  return (
    <div className={cx("flex flex-col rounded-xl", TINT[level])}>
      {expandable ? (
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 rounded-xl px-4 py-3">
          {head}
          <ChevronDown aria-hidden="true" className={cx("ml-auto size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">{head}</div>
      )}
      {expandable && open && (
        <ul id={listId} aria-label="Per una previsione più fedele" className="mx-4 mb-3 flex flex-col divide-y divide-border border-t border-border">
          {suggestions.map((s) => (
            <li key={`${s.kind}-${s.accountId}`}>
              <Link href={s.href} className="flex items-center justify-between gap-3 py-2 text-sm text-ink hover:text-brand-ink">
                <span>{s.message}</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
