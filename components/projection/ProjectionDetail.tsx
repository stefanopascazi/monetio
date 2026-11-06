"use client";

import { useState } from "react";
import { Accordion, Amount, Badge, type BadgeTone, Select } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { type DetailMonthView, detailMonthViews } from "@/lib/data/projection-detail-view";
import { monthLabel } from "@/lib/domain/dates";
import type { DetailItem, ProjectionDetailMonth } from "@/lib/domain/projection-details";

const SOURCE: Record<DetailItem["source"], { label: string; tone: BadgeTone } | null> = {
  rule: null,
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
                  <span className="truncate">
                    {x.label}
                    {x.count > 1 ? ` ×${x.count}` : ""}
                  </span>
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

function MonthBody({ m }: { m: DetailMonthView }) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Lines title="Entrate" items={m.income} empty="Nessuna entrata prevista." />
        <Lines title="Uscite" items={m.expense} empty="Nessuna uscita prevista." />
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
        Saldo da <Amount cents={m.openingCents} tone="neutral" size="sm" /> a{" "}
        <Amount cents={m.closingCents} tone={m.closingCents < 0 ? "expense" : "neutral"} size="sm" />
      </p>
    </div>
  );
}

/** Month-by-month list of what makes each projected balance, per account or for all of them. */
export function ProjectionDetail({ details, accounts }: { details: ProjectionDetailMonth[]; accounts: NamedRef[] }) {
  const [selected, setSelected] = useState("all");
  const [open, setOpen] = useState<string[]>(details[0] ? [details[0].month] : []);
  const ids = selected === "all" ? accounts.map((a) => a.id) : [selected];
  const months = detailMonthViews(details, ids);
  return (
    <div className="flex flex-col gap-3">
      <div className="px-5 pt-1">
        <Select
          label="Conto"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          options={[{ value: "all", label: "Tutti i conti" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          className="max-w-xs"
        />
      </div>
      <Accordion
        type="multiple"
        value={open}
        onValueChange={setOpen}
        items={months.map((m) => ({
          id: m.month,
          title: (
            <span className="flex min-w-0 flex-col text-left">
              <span className="font-semibold capitalize">{monthLabel(m.month, true)}</span>
              <span className="text-sm font-normal text-ink-muted">
                {m.income.length} entrate · {m.expense.length} uscite
              </span>
            </span>
          ),
          meta: <Amount cents={m.netCents} size="sm" showSign />,
          content: open.includes(m.month) ? <MonthBody m={m} /> : null,
        }))}
      />
    </div>
  );
}
