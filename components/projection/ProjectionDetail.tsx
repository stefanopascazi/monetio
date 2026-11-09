"use client";

import { useState } from "react";
import { Accordion, Amount, Badge, type BadgeTone } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { type DetailMonthView, detailMonthViews } from "@/lib/data/projection-detail-view";
import { monthLabel } from "@/lib/domain/dates";
import type { DetailItem, ProjectionDetailMonth } from "@/lib/domain/projection-details";
import { visibleAccounts } from "./account/account-filter";
import { useProjectionAccount } from "./account/ProjectionAccountContext";
import { MonthBalances, MonthClosing, MonthSubtitle } from "./detail/MonthBalances";
import { movementCountLabel } from "./detail/movement-count";

const SOURCE: Record<DetailItem["source"], { label: string; tone: BadgeTone } | null> = {
  rule: null,
  booked: null,
  estimate: { label: "stima", tone: "forecast" },
  contribution: { label: "quota", tone: "transfer" },
  planned: { label: "pianificato", tone: "neutral" },
};

function Lines({ title, items, empty }: { title: string; items: DetailItem[]; empty: string }) {
  const total = items.reduce((s, x) => s + x.amountCents, 0);
  return (
    <section className="flex flex-col gap-1">
      <h4 className="flex items-center justify-between text-sm font-semibold text-ink">
        <span>{title}</span>
        {items.length > 0 && <Amount cents={total} size="sm" showSign />}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((x) => {
            const src = SOURCE[x.source];
            return (
              <li key={`${x.source}|${x.label}|${x.overdue}`} className="flex items-center justify-between gap-3 border-t border-[var(--mio-border)] py-1.5 text-sm">
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate">{x.label}</span>
                  {x.count > 1 && <span className="text-xs text-ink-muted">{movementCountLabel(x.count)}</span>}
                  {src && (
                    <Badge size="sm" tone={src.tone}>
                      {src.label}
                    </Badge>
                  )}
                  {x.overdue && (
                    <Badge size="sm" tone="expense">
                      arretrato
                    </Badge>
                  )}
                </span>
                <Amount cents={x.amountCents} size="sm" showSign />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Group({ title, income, expense, kind }: { title?: string; income: DetailItem[]; expense: DetailItem[]; kind: "prevista" | "registrata" }) {
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Lines title="Entrate" items={income} empty={`Nessuna entrata ${kind}.`} />
        <Lines title="Uscite" items={expense} empty={`Nessuna uscita ${kind}.`} />
      </div>
    </section>
  );
}

function MonthBody({ m }: { m: DetailMonthView }) {
  const hasBooked = m.bookedIncome.length > 0 || m.bookedExpense.length > 0;
  return (
    <div className="flex flex-col gap-4 pb-2">
      <MonthBalances openingCents={m.openingCents} netCents={m.netCents} closingCents={m.closingCents} />
      {hasBooked ? (
        <>
          <Group title="Già registrati" income={m.bookedIncome} expense={m.bookedExpense} kind="registrata" />
          <Group title="Ancora previsti" income={m.income} expense={m.expense} kind="prevista" />
        </>
      ) : (
        <Group income={m.income} expense={m.expense} kind="prevista" />
      )}
    </div>
  );
}

/** Month-by-month list of what makes each projected balance, for the page-wide account selection. */
export function ProjectionDetail({ details, accounts }: { details: ProjectionDetailMonth[]; accounts: NamedRef[] }) {
  const { selected } = useProjectionAccount();
  // Months open only on request.
  const [open, setOpen] = useState<string[]>([]);
  const ids = visibleAccounts(accounts, selected).map((a) => a.id);
  const months = detailMonthViews(details, ids);
  return (
    <Accordion
        type="multiple"
        value={open}
        onValueChange={setOpen}
        items={months.map((m) => ({
          id: m.month,
          title: (
            <span className="flex min-w-0 flex-col text-left">
              <span className="font-semibold capitalize">{monthLabel(m.month, true)}</span>
              <MonthSubtitle openingCents={m.openingCents} netCents={m.netCents} />
            </span>
          ),
          meta: <MonthClosing closingCents={m.closingCents} />,
          content: open.includes(m.month) ? <MonthBody m={m} /> : null,
        }))}
    />
  );
}
