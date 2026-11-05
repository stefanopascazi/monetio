"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { AmountInput, Button, FormPanel, SegmentedControl, Select, Switch, TextField } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/common/FormMessage";
import { enumOptions, FREQUENCY_LABEL, type NamedRef, SCHEDULE_HINT, SCHEDULE_LABEL, toOptions } from "@/components/common/options";
import { useFormAction } from "@/hooks/useFormAction";
import type { RecurringRule, RuleSchedule } from "@/lib/domain/types";

type Kind = "expense" | "income" | "transfer";

export interface RuleFormProps {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  accounts: NamedRef[];
  categories: NamedRef[];
  rule?: RecurringRule;
  today: string;
}

/** Create (collapsible panel) or edit (embedded) a recurring rule. */
export function RuleForm({ action, accounts, categories, rule, today }: RuleFormProps) {
  const embedded = !!rule;
  const [kind, setKind] = useState<Kind>(rule?.kind ?? "expense");
  const [schedule, setSchedule] = useState<RuleSchedule>(rule?.schedule ?? "auto");
  const [amount, setAmount] = useState<number | null>(rule ? Math.abs(rule.amountCents) : null);
  const [active, setActive] = useState(rule?.active ?? true);
  const [open, setOpen] = useState(embedded);
  const [formKey, setFormKey] = useState(0);
  const reset = useCallback(() => {
    if (embedded) return;
    setAmount(null);
    setFormKey((k) => k + 1);
  }, [embedded]);
  const { state, pending, onSubmit, error } = useFormAction(action, reset);

  return (
    <FormPanel
      key={formKey}
      title={embedded ? "Modifica ricorrenza" : "Nuova ricorrenza"}
      description={embedded ? undefined : "Entrate e uscite che si ripetono"}
      icon={embedded ? undefined : <Plus />}
      collapsible={!embedded}
      open={open}
      onOpenChange={setOpen}
      onSubmit={onSubmit}
      actions={
        <Button type="submit" loading={pending} disabled={!amount}>
          {embedded ? "Salva ricorrenza" : "Aggiungi ricorrenza"}
        </Button>
      }
    >
      <FormMessage state={state} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="schedule" value={schedule} />
      <input type="hidden" name="amountCents" value={amount ?? ""} />
      <input type="hidden" name="active" value={String(active)} />
      <SegmentedControl<Kind>
        aria-label="Tipo"
        className="mio-span-full"
        block
        value={kind}
        onChange={setKind}
        options={[
          { value: "expense", label: "Uscita", tone: "expense" },
          { value: "income", label: "Entrata", tone: "income" },
          { value: "transfer", label: "Giroconto", tone: "transfer" },
        ]}
      />
      <div className="mio-span-full flex flex-col gap-2">
        <SegmentedControl<RuleSchedule>
          aria-label="Gestione"
          block
          value={schedule}
          onChange={setSchedule}
          options={(Object.keys(SCHEDULE_LABEL) as RuleSchedule[]).map((s) => ({ value: s, label: SCHEDULE_LABEL[s] }))}
        />
        <p className="text-sm text-ink-muted">{SCHEDULE_HINT[schedule]}</p>
      </div>
      <AmountInput
        label={schedule === "auto" ? "Importo" : "Importo previsto"}
        kind={kind}
        valueCents={amount}
        onValueChange={setAmount}
        error={error("amountCents")}
        className="mio-span-full"
      />
      <TextField name="description" label="Descrizione" placeholder="Es. Rata mutuo" defaultValue={rule?.description} error={error("description")} required />
      <Select name="accountId" label={kind === "transfer" ? "Dal conto" : "Conto"} defaultValue={rule?.accountId ?? accounts[0]?.id} options={toOptions(accounts)} error={error("accountId")} />
      {kind === "transfer" && (
        <Select
          name="counterpartAccountId"
          label="Al conto"
          defaultValue={rule?.counterpartAccountId ?? ""}
          placeholder="Scegli il conto"
          options={toOptions(accounts)}
          error={error("counterpartAccountId")}
        />
      )}
      <Select name="categoryId" label="Categoria" optional defaultValue={rule?.categoryId ?? ""} options={[{ value: "", label: "Nessuna" }, ...toOptions(categories)]} />
      <Select name="frequency" label="Frequenza" defaultValue={rule?.frequency ?? "monthly"} options={enumOptions(FREQUENCY_LABEL)} error={error("frequency")} />
      <TextField name="dayOfMonth" label="Giorno del mese" type="number" min={1} max={31} defaultValue={rule?.dayOfMonth ?? 1} error={error("dayOfMonth")} hint="Per le settimanali conta la data di inizio" />
      <TextField name="startDate" label="Dal" type="date" defaultValue={rule?.startDate ?? today} error={error("startDate")} required />
      <TextField name="endDate" label="Fino al" type="date" optional defaultValue={rule?.endDate ?? ""} error={error("endDate")} />
      {embedded && <Switch label="Attiva" description="Se disattivata non genera movimenti né proiezioni" checked={active} onCheckedChange={setActive} className="mio-span-full" />}
    </FormPanel>
  );
}
