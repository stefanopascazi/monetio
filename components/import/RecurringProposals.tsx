"use client";

import { useState } from "react";
import { Amount, Button, Card } from "@monetio/ui";
import { Repeat } from "lucide-react";
import { createRule } from "@/app/actions/rules";
import { useToastAction } from "@/hooks/useToastAction";
import { dateLabel } from "@/lib/domain/dates";
import type { RecurringProposal } from "@/lib/import/recurring";
import { type CategoryOption, frequencyLabel } from "./import-view";
import { ruleFormData } from "./recurring-form";

export interface RecurringProposalsProps {
  accountId: string;
  proposals: RecurringProposal[];
  categories: CategoryOption[];
}

/** Movements that repeat over the months, each one a rule to create with one tap. */
export function RecurringProposals({ accountId, proposals, categories }: RecurringProposalsProps) {
  const { pending, run } = useToastAction();
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});
  const open = proposals.filter((p) => !created.has(p.key));
  if (!open.length) return null;
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <Card title="Ricorrenze trovate" subtitle="Movimenti che si ripetono: trasformali in regole per vederli nelle proiezioni.">
      <ul className="flex flex-col gap-4">
        {open.map((p) => {
          const name = names[p.key] ?? p.description;
          return (
            <li key={p.key} className="flex flex-col gap-2 rounded-[16px] bg-surface-raised p-3">
              <div className="flex items-start justify-between gap-3">
                <input
                  aria-label="Nome della regola"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setNames((prev) => ({ ...prev, [p.key]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-2 py-1 text-sm font-semibold"
                />
                <Amount cents={p.amountCents} showSign />
              </div>
              <span className="text-xs text-ink-muted">
                {frequencyLabel(p.frequency)}, il giorno {p.dayOfMonth} · visto {p.occurrences} volte, l&apos;ultima il {dateLabel(p.lastDate)}
                {categoryName(p.categoryId) ? ` · ${categoryName(p.categoryId)}` : ""}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="w-fit"
                iconStart={<Repeat />}
                disabled={pending || !name.trim()}
                onClick={() =>
                  run(
                    () => createRule({}, ruleFormData(accountId, { ...p, description: name.trim() })),
                    () => setCreated((prev) => new Set(prev).add(p.key)),
                  )
                }
              >
                Crea regola dal {dateLabel(p.startDate)}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
