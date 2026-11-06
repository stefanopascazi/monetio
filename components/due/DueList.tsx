"use client";

import { CalendarCheck, FileCheck2, PencilLine, Search } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, DueItem, EmptyState, Select, TextField } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { groupDueByMonth } from "@/lib/data/due-groups";
import { isoToDate } from "@/lib/domain/dates";
import type { PaymentMethod, RuleFrequency } from "@/lib/domain/types";
import { feeBreakdown } from "@/components/payments/fee-breakdown";
import { ActualAmountForm } from "./ActualAmountForm";
import { PayEntryForm } from "./PayEntryForm";

export interface DueView {
  key: string;
  accountId: string;
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
  kind: "income" | "expense" | "transfer";
  /** Bonifico/CBill (transfers take a fee too): paying also books `feeCents` (positive, 0 = none). */
  paymentMethod: PaymentMethod | null;
  feeCents: number;
}

const normalize = (s: string) => s.toLocaleLowerCase("it").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Deadlines by month; with `accounts` it also shows a search box and an account filter. */
export function DueList({
  items: all,
  today,
  title = "Da pagare",
  subtitle,
  accounts,
}: {
  items: DueView[];
  today: string;
  title?: string;
  subtitle?: string;
  accounts?: NamedRef[];
}) {
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("");
  const q = normalize(query.trim());
  const items = all.filter((e) => (!accountId || e.accountId === accountId) && (!q || normalize(`${e.description} ${e.accountName}`).includes(q)));
  // One inline panel at a time: paying an item or entering its actual amount.
  const [open, setOpen] = useState<{
    key: string;
    mode: "pay" | "actual";
  } | null>(null);
  const close = () => setOpen(null);
  return (
    <Card tone="coral" title={title} subtitle={subtitle} padding="none">
      {accounts && (
        <div className="grid grid-cols-1 gap-3 px-5 pb-4 sm:grid-cols-2">
          <TextField label="Cerca" placeholder="Es. luce, quota" value={query} onChange={(e) => setQuery(e.target.value)} prefix={<Search className="size-4" aria-hidden="true" />} />
          <Select
            label="Conto"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={[{ value: "", label: "Tutti i conti" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </div>
      )}
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
                  // Bonifico/CBill/transfer: total including the fee; the split is shown below.
                  amountCents={Math.abs(feeBreakdown(e.amountCents, e.feeCents).totalCents)}
                  amountNote={feeBreakdown(e.amountCents, e.feeCents).label}
                  kind={e.amountCents >= 0 ? "income" : "expense"}
                  frequency={e.frequency}
                  account={e.accountName}
                  today={isoToDate(today)}
                  // Paid from an account the viewer cannot see: shown lighter, no actions.
                  className={e.payable ? undefined : "opacity-75"}
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
