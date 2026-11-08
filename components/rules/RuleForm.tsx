"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { AmountInput, Button, FormPanel, SegmentedControl, Select, Switch, TextField } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/common/FormMessage";
import { accountOptions } from "@/components/common/account-options";
import { type NamedRef, SCHEDULE_HINT, SCHEDULE_LABEL, toOptions } from "@/components/common/options";
import { FeeInput } from "@/components/payments/FeeInput";
import { amountKind, isPaymentKind, MOVEMENT_KIND_OPTIONS, takesFee } from "@/components/payments/movement-kind";
import { useFormAction } from "@/hooks/useFormAction";
import type { RecurringRule, RuleSchedule } from "@/lib/domain/types";
import { formKindOf, type MovementFormKind } from "@/lib/forms/payment";
import { DecreasingEstimateFields } from "./DecreasingEstimateFields";
import { RuleScheduleFields } from "./RuleScheduleFields";

type Kind = MovementFormKind;

export interface RuleFormProps {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  accounts: NamedRef[];
  categories: NamedRef[];
  /** Household accounts the viewer cannot see, offered as transfer destinations. */
  transferTargets?: NamedRef[];
  rule?: RecurringRule;
  today: string;
  /** Edit mode: called after a successful save (e.g. to close the parent accordion). */
  onSaved?: () => void;
}

/** Create (collapsible panel) or edit (embedded) a recurring rule. */
export function RuleForm({ action, accounts, categories, transferTargets, rule, today, onSaved }: RuleFormProps) {
  const embedded = !!rule;
  const [kind, setKind] = useState<Kind>(rule ? formKindOf(rule.kind, rule.paymentMethod) : "expense");
  const [fee, setFee] = useState<number | null>(rule?.feeCents || null);
  const [schedule, setSchedule] = useState<RuleSchedule>(rule?.schedule ?? "auto");
  const [amount, setAmount] = useState<number | null>(rule ? Math.abs(rule.amountCents) : null);
  const [active, setActive] = useState(rule?.active ?? true);
  const [open, setOpen] = useState(embedded);
  const [formKey, setFormKey] = useState(0);
  // After saving: close the panel so the outcome is visible, and clear the create form.
  const reset = useCallback(() => {
    if (embedded) return onSaved?.();
    setOpen(false);
    setAmount(null);
    setFee(null);
    setKind("expense");
    setSchedule("auto");
    setFormKey((k) => k + 1);
  }, [embedded, onSaved]);
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
        onChange={(k) => {
          setKind(k);
          if (isPaymentKind(k) && schedule === "estimate") setSchedule("due");
        }}
        options={MOVEMENT_KIND_OPTIONS}
      />
      <div className="mio-span-full flex flex-col gap-2">
        <SegmentedControl<RuleSchedule>
          aria-label="Gestione"
          block
          value={schedule}
          onChange={setSchedule}
          // Payments always create movements: an estimate cannot be a bonifico/CBill.
          options={(Object.keys(SCHEDULE_LABEL) as RuleSchedule[])
            .filter((s) => !(isPaymentKind(kind) && s === "estimate"))
            .map((s) => ({ value: s, label: SCHEDULE_LABEL[s] }))}
        />
        <p className="text-sm text-ink-muted">{SCHEDULE_HINT[schedule]}</p>
        {error("schedule") && <p className="text-sm text-danger">{error("schedule")}</p>}
      </div>
      <AmountInput
        label={schedule === "auto" ? "Importo" : "Importo previsto"}
        kind={amountKind(kind)}
        valueCents={amount}
        onValueChange={setAmount}
        error={error("amountCents")}
        className="mio-span-full"
      />
      {/* Estimates create no movements, so a transfer estimate has no fee. */}
      {takesFee(kind) && schedule !== "estimate" && (
        <FeeInput valueCents={fee} onValueChange={setFee} hint="Registrate come movimento separato a ogni pagamento" error={error("feeCents")} />
      )}
      <TextField name="description" label="Descrizione" placeholder="Es. Rata mutuo" defaultValue={rule?.description} error={error("description")} required />
      <Select name="accountId" label={kind === "transfer" ? "Dal conto" : "Conto"} defaultValue={rule?.accountId ?? accounts[0]?.id} options={toOptions(accounts)} error={error("accountId")} />
      {kind === "transfer" && (
        <Select
          name="counterpartAccountId"
          label="Al conto"
          defaultValue={rule?.counterpartAccountId ?? ""}
          placeholder="Scegli il conto"
          options={accountOptions(accounts, transferTargets, rule?.counterpartAccountId ? { id: rule.counterpartAccountId, name: "Conto privato" } : null)}
          error={error("counterpartAccountId")}
        />
      )}
      <Select name="categoryId" label="Categoria" optional defaultValue={rule?.categoryId ?? ""} options={[{ value: "", label: "Nessuna" }, ...toOptions(categories)]} />
      {schedule === "estimate" && (kind === "expense" || kind === "income") && (
        <DecreasingEstimateFields categories={categories} initial={rule?.decrementCategoryIds} error={error("decrementCategoryIds")} />
      )}
      <RuleScheduleFields rule={rule} today={today} error={error} />
      <TextField name="endDate" label="Fino al" type="date" optional defaultValue={rule?.endDate ?? ""} error={error("endDate")} />
      {embedded && <Switch label="Attiva" description="Se disattivata non genera movimenti né proiezioni" checked={active} onCheckedChange={setActive} className="mio-span-full" />}
    </FormPanel>
  );
}
