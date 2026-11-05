"use client";

import { Repeat, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Accordion, Alert, Amount, Badge, EmptyState, InlineConfirm } from "@monetio/ui";
import { deleteRule, updateRule } from "@/app/actions/rules";
import type { ActionState } from "@/app/actions/state";
import { FREQUENCY_LABEL, type NamedRef, SCHEDULE_LABEL } from "@/components/common/options";
import { dateLabel } from "@/lib/domain/dates";
import type { RecurringRule } from "@/lib/domain/types";
import { RuleForm } from "./RuleForm";

export interface RuleView extends RecurringRule {
  accountName: string;
  nextDate: string | null;
}

function RuleBody({ rule, accounts, categories, today }: { rule: RuleView; accounts: NamedRef[]; categories: NamedRef[]; today: string }) {
  const [result, setResult] = useState<ActionState | null>(null);
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-4 pb-2">
      {result?.message && <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert>}
      <RuleForm rule={rule} action={updateRule.bind(null, rule.id)} accounts={accounts} categories={categories} today={today} />
      <InlineConfirm
        triggerLabel="Elimina ricorrenza"
        triggerIcon={<Trash2 />}
        message="Elimino la ricorrenza? I movimenti già registrati restano."
        confirmLabel="Elimina"
        onConfirm={() => start(async () => setResult(await deleteRule(rule.id)))}
      />
    </div>
  );
}

export function RuleList({ rules, accounts, categories, today }: { rules: RuleView[]; accounts: NamedRef[]; categories: NamedRef[]; today: string }) {
  const [open, setOpen] = useState<string[]>([]);
  if (!rules.length) return <EmptyState icon={<Repeat />} title="Nessuna ricorrenza" description="Aggiungi stipendi, rate e bollette per vedere scadenze e proiezioni." />;
  return (
    <Accordion
      type="single"
      value={open}
      onValueChange={setOpen}
      items={rules.map((r) => ({
        id: r.id,
        title: (
          <span className="flex min-w-0 flex-col text-left">
            <span className="flex items-center gap-2 truncate font-semibold">
              {r.description}
              {!r.active && <Badge size="sm">Disattivata</Badge>}
            </span>
            <span className="truncate text-sm font-normal text-ink-muted">
              {[SCHEDULE_LABEL[r.schedule], FREQUENCY_LABEL[r.frequency], r.accountName, r.nextDate ? `prossima ${dateLabel(r.nextDate)}` : "conclusa"].join(" · ")}
            </span>
          </span>
        ),
        meta: <Amount cents={r.amountCents} tone={r.kind === "transfer" ? "transfer" : "auto"} showSign />,
        content: open.includes(r.id) ? <RuleBody rule={r} accounts={accounts} categories={categories} today={today} /> : null,
      }))}
    />
  );
}
