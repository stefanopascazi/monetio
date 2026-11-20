"use client";

import { useEffect, useState } from "react";
import { Amount, Badge, Skeleton } from "@monetio/ui";
import { loadBankSyncBatchDetail } from "@/app/actions/bank-sync-batches";
import { type BankSyncBatchDetail, type BatchChange, type BatchMovement, changeNotes, REVIEW_STATE_LABEL } from "@/lib/banking/sync-batches";
import { dateLabel } from "@/lib/domain/dates";
import type { ISODate } from "@/lib/domain/types";

const day = (iso: string) => dateLabel(iso.slice(0, 10) as ISODate);

function Row({ m, children, aside }: { m: BatchMovement; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{m.description}</span>
        <span className="text-ink-muted">{day(m.bookedOn)}</span>
        {children}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Amount cents={m.amountCents} size="sm" showSign />
        {aside}
      </span>
    </li>
  );
}

/** "Prima: previsto · 12 nov · −50,00": the values undo would put back. */
function Previous({ c }: { c: BatchChange }) {
  const n = changeNotes(c);
  if (!n.status && !n.bookedOn && !n.amount) return <span className="text-ink-muted">Aggiunto solo il riferimento della banca</span>;
  return (
    <span className="text-ink-muted">
      Prima: {[n.status && (c.prevStatus === "planned" ? "previsto" : "registrato"), n.bookedOn && day(c.prevBookedOn)].filter(Boolean).join(" · ")}
      {n.amount && (
        <>
          {n.status || n.bookedOn ? " · " : ""}
          <Amount cents={c.prevAmountCents} tone="neutral" size="sm" showSign />
        </>
      )}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <section className="flex flex-col gap-1" aria-label={title}>
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold">{title}</h4>
        <Badge size="sm" tone="neutral">
          {count}
        </Badge>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-[14px] bg-surface">{children}</ul>
    </section>
  );
}

/** Movements a sync batch wrote, loaded when opened. */
export function BankSyncBatchDetails({ batchId }: { batchId: string }) {
  const [detail, setDetail] = useState<BankSyncBatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadBankSyncBatchDetail(batchId).then((res) => {
      if (!live) return;
      if (res.ok && res.detail) setDetail(res.detail);
      else setError(res.message ?? "Dettaglio non disponibile.");
    });
    return () => {
      live = false;
    };
  }, [batchId]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!detail) return <Skeleton lines={3} />;
  const { inserted, reconciled, reviews } = detail;
  if (!inserted.length && !reconciled.length && !reviews.length) return <p className="text-ink-muted">Nessun movimento.</p>;
  return (
    <div className="flex flex-col gap-3">
      <Section title="Nuovi" count={inserted.length}>
        {inserted.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </Section>
      <Section title="Abbinati" count={reconciled.length}>
        {reconciled.map((c) => (
          <Row key={c.id} m={c}>
            <Previous c={c} />
          </Row>
        ))}
      </Section>
      <Section title="Da rivedere ed esclusi" count={reviews.length}>
        {reviews.map((r) => (
          <Row
            key={r.id}
            m={r}
            aside={
              <Badge size="sm" tone={r.state === "open" ? "warning" : "neutral"}>
                {REVIEW_STATE_LABEL[r.state]}
              </Badge>
            }
          />
        ))}
      </Section>
    </div>
  );
}
