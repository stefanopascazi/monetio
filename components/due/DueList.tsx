"use client";

import { CalendarCheck, FileCheck2, PencilLine } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, DueItem, EmptyState } from "@monetio/ui";
import { groupDueByMonth } from "@/lib/data/due-groups";
import { isoToDate } from "@/lib/domain/dates";
import type { RuleFrequency } from "@/lib/domain/types";
import { ActualAmountForm } from "./ActualAmountForm";
import { PayEntryForm } from "./PayEntryForm";

export interface DueView {
  key: string;
  date: string;
  description: string;
  amountCents: number;
  accountName: string;
  frequency: RuleFrequency;
  estimated: boolean;
  /** Actual amount/date entered (e.g. the bill arrived). */
  confirmed: boolean;
  note: string | null;
  canConfirm: boolean;
  /** False when the paying account is not visible to the viewer. */
  payable: boolean;
}

export function DueList({
  items,
  today,
  title = "Da pagare",
  subtitle,
}: {
  items: DueView[];
  today: string;
  title?: string;
  subtitle?: string;
}) {
  // One inline panel at a time: paying an item or entering its actual amount.
  const [open, setOpen] = useState<{
    key: string;
    mode: "pay" | "actual";
  } | null>(null);
  const close = () => setOpen(null);
  return (
    <Card tone="coral" title={title} subtitle={subtitle} padding="none">
      {!items.length ? (
        <EmptyState
          icon={<CalendarCheck />}
          title="Tutto in regola"
          description="Nessuna scadenza nei prossimi 31 giorni."
        />
      ) : (
        groupDueByMonth(items, today).map((g) => (
          <section key={g.month} aria-label={g.label}>
            <h3
              className={`flex items-center justify-between px-5 py-2 text-sm font-semibold capitalize ${
                g.tone === "past"
                  ? "bg-danger-soft text-danger"
                  : g.tone === "current"
                    ? "bg-surface-sunken text-ink"
                    : "bg-surface-sunken text-ink-muted"
              }`}
            >
              <span>{g.label}</span>
              <span className="font-normal normal-case">
                {g.items.length === 1
                  ? "1 scadenza"
                  : `${g.items.length} scadenze`}
              </span>
            </h3>
            {g.items.map((e) => (
              <div key={e.key}>
                <DueItem
                  title={
                    e.estimated ? `${e.description} (stima)` : e.description
                  }
                  dueDate={isoToDate(e.date)}
                  amountCents={Math.abs(e.amountCents)}
                  kind={e.amountCents >= 0 ? "income" : "expense"}
                  frequency={e.frequency}
                  account={e.accountName}
                  today={isoToDate(today)}
                  onMarkPaid={
                    e.payable && open?.key !== e.key
                      ? () => setOpen({ key: e.key, mode: "pay" })
                      : undefined
                  }
                  action={
                    e.canConfirm && e.payable && open?.key !== e.key ? (
                      <>
                        {e.confirmed && (
                          <Badge
                            tone="success"
                            size="sm"
                            icon={<FileCheck2 aria-hidden="true" />}
                          >
                            Importo reale
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          iconStart={<PencilLine />}
                          onClick={() =>
                            setOpen({ key: e.key, mode: "actual" })
                          }
                        >
                          {e.confirmed ? "Modifica importo" : "Importo reale"}
                        </Button>
                      </>
                    ) : undefined
                  }
                />
                {e.note && (
                  <p className="-mt-1 px-5 pb-2 text-sm text-ink-muted">
                    {e.note}
                  </p>
                )}
                {open?.key === e.key && open.mode === "pay" && (
                  <PayEntryForm entry={e} today={today} onClose={close} />
                )}
                {open?.key === e.key && open.mode === "actual" && (
                  <ActualAmountForm entry={e} onClose={close} />
                )}
              </div>
            ))}
          </section>
        ))
      )}
    </Card>
  );
}
