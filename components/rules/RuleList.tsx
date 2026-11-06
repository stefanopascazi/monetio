"use client";

import { Repeat, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Accordion, Amount, Badge, Card, EmptyState, InlineConfirm, TextField } from "@monetio/ui";
import { deleteRule, updateRule } from "@/app/actions/rules";
import { FREQUENCY_LABEL, type NamedRef, SCHEDULE_LABEL } from "@/components/common/options";
import { groupRules } from "@/lib/data/rule-groups";
import { dateLabel } from "@/lib/domain/dates";
import type { RecurringRule } from "@/lib/domain/types";
import { useToastAction } from "@/hooks/useToastAction";
import { RuleForm } from "./RuleForm";

export interface RuleView extends RecurringRule {
  accountName: string;
  categoryName: string | null;
  nextDate: string | null;
  /** Paying account label (hidden accounts name their owner). */
  sourceName: string;
  /** Amount from the viewer's side (incoming transfers from hidden accounts are positive). */
  viewCents: number;
  editable: boolean;
}

function RuleBody({ rule, accounts, categories, today, onDone }: { rule: RuleView; accounts: NamedRef[]; categories: NamedRef[]; today: string; onDone: () => void }) {
  const { run } = useToastAction();
  if (!rule.editable) return <p className="pb-2 text-sm text-ink-muted">Può modificarla solo chi vede il conto di partenza.</p>;
  return (
    <div className="flex flex-col gap-4 pb-2">
      <RuleForm rule={rule} action={updateRule.bind(null, rule.id)} accounts={accounts} categories={categories} today={today} onSaved={onDone} />
      <InlineConfirm
        triggerLabel="Elimina ricorrenza"
        triggerIcon={<Trash2 />}
        message="Elimino la ricorrenza? I movimenti già registrati restano."
        confirmLabel="Elimina"
        onConfirm={() => run(() => deleteRule(rule.id), onDone)}
      />
    </div>
  );
}

function RuleAccordion({
  rules,
  open,
  setOpen,
  accounts,
  categories,
  today,
}: {
  rules: RuleView[];
  open: string[];
  setOpen: (v: string[]) => void;
  accounts: NamedRef[];
  categories: NamedRef[];
  today: string;
}) {
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
              {[SCHEDULE_LABEL[r.schedule], FREQUENCY_LABEL[r.frequency], r.categoryName, r.counterpartAccountId ? r.accountName : null, r.nextDate ? `prossima ${dateLabel(r.nextDate)}` : "conclusa"]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        ),
        meta: <Amount cents={r.viewCents} tone={r.kind === "transfer" ? "transfer" : "auto"} showSign />,
        content: open.includes(r.id) ? <RuleBody rule={r} accounts={accounts} categories={categories} today={today} onDone={() => setOpen([])} /> : null,
      }))}
    />
  );
}

/** Rules grouped by account, each split into real movements and estimates, with a search box. */
export function RuleList({ rules, accounts, categories, today }: { rules: RuleView[]; accounts: NamedRef[]; categories: NamedRef[]; today: string }) {
  const [open, setOpen] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  if (!rules.length) return <EmptyState icon={<Repeat />} title="Nessuna ricorrenza" description="Aggiungi stipendi, rate e bollette per vedere scadenze e proiezioni." />;
  const groups = groupRules(rules, accounts, query);
  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Cerca ricorrenza"
        placeholder="Descrizione, conto o categoria"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        prefix={<Search className="size-4" aria-hidden="true" />}
        className="max-w-md"
      />
      {groups.length === 0 && <EmptyState icon={<Search />} title="Nessun risultato" description={`Nessuna ricorrenza contiene "${query}".`} />}
      {groups.map((g) => {
        // Rules paid from accounts the viewer cannot see: lighter and read-only.
        const foreign = [...g.effective, ...g.estimates].every((r) => !r.editable);
        const count = `${g.effective.length + g.estimates.length} ricorrenze`;
        return (
          <Card
            key={g.accountId}
            title={g.accountName}
            subtitle={foreign ? `${count} · in arrivo sui tuoi conti, sola lettura` : count}
            padding="none"
            className={foreign ? "opacity-75" : undefined}
          >
            {g.effective.length > 0 && (
              <section aria-label={`${g.accountName}: effettive`}>
                <h3 className="bg-surface-sunken px-5 py-2 text-sm font-semibold text-ink">Effettive · automatiche e a scadenza</h3>
                <RuleAccordion rules={g.effective} open={open} setOpen={setOpen} accounts={accounts} categories={categories} today={today} />
              </section>
            )}
            {g.estimates.length > 0 && (
              <section aria-label={`${g.accountName}: stime`}>
                <h3 className="bg-forecast-soft px-5 py-2 text-sm font-semibold text-forecast-ink">Stime · solo per le proiezioni</h3>
                <RuleAccordion rules={g.estimates} open={open} setOpen={setOpen} accounts={accounts} categories={categories} today={today} />
              </section>
            )}
          </Card>
        );
      })}
    </div>
  );
}
