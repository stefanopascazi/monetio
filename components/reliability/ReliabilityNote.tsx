"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { cx } from "@monetio/ui";
import { LEVEL_LABEL, type ReliabilityLevel } from "@/lib/domain/reliability";
import { type ReliabilityData, reliabilityFor } from "./reliability-view";

const DOT: Record<ReliabilityLevel, string> = { high: "bg-success", medium: "bg-warning", low: "bg-danger" };

/**
 * Discreet reliability marker for a projection: below high reliability it opens, inline,
 * the actions that bring the forecast closer to reality.
 */
export function ReliabilityNote({ data, seriesId }: { data: ReliabilityData; seriesId: string }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { level, score, suggestions } = reliabilityFor(data, seriesId);
  const expandable = level !== "high" && suggestions.length > 0;
  const label = `Affidabilità ${LEVEL_LABEL[level].toLowerCase()}`;
  const dot = <span aria-hidden="true" className={cx("size-2 rounded-full", DOT[level])} />;

  return (
    <div className="flex flex-col gap-2 text-xs text-ink-muted">
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 font-semibold hover:bg-surface-raised hover:text-ink"
        >
          {dot}
          {label} · {score}/100
          <ChevronDown aria-hidden="true" className={cx("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      ) : (
        <span className="inline-flex w-fit items-center gap-2 px-2 py-1">
          {dot}
          {label}
        </span>
      )}
      {expandable && open && (
        <div id={listId} className="flex flex-col gap-1 rounded-lg bg-surface-raised p-3">
          <span className="font-semibold text-ink">Per una previsione più fedele</span>
          <ul className="flex flex-col">
            {suggestions.map((s) => (
              <li key={`${s.kind}-${s.accountId}`}>
                <Link href={s.href} className="flex items-center justify-between gap-3 py-1.5 text-sm text-ink hover:text-brand-ink">
                  <span>{s.message}</span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
