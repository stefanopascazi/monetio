"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { AmountInput, Button, FormPanel, SegmentedControl, Select, Switch, TextField } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/common/FormMessage";
import { accountOptions } from "@/components/common/account-options";
import { type NamedRef, toOptions } from "@/components/common/options";
import { useFormAction } from "@/hooks/useFormAction";
import { FeeInput } from "@/components/payments/FeeInput";
import { amountKind, MOVEMENT_KIND_OPTIONS, takesFee } from "@/components/payments/movement-kind";
import type { MovementFormKind } from "@/lib/forms/payment";

type Kind = MovementFormKind;

export interface TransactionDefaults {
  kind: Kind;
  accountId: string;
  /** Label of the paying account, kept listed when the viewer cannot see it. */
  accountName?: string | null;
  counterpartAccountId?: string | null;
  /** Label of the current destination, kept listed when it is a hidden account. */
  counterpartName?: string | null;
  categoryId?: string | null;
  amountCents?: number | null;
  /** Linked fee of a bonifico/CBill/transfer being edited. */
  feeCents?: number | null;
  bookedOn: string;
  description?: string;
  notes?: string | null;
  planned?: boolean;
  skipEstimates?: boolean;
}

export interface TransactionFormProps {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  accounts: NamedRef[];
  categories: NamedRef[];
  /** Household accounts the viewer cannot see, offered as transfer destinations. */
  transferTargets?: NamedRef[];
  defaults: TransactionDefaults;
  title?: string;
  submitLabel?: string;
  /** Edit mode: embedded (no collapsible panel) and kind locked for transfers. */
  embedded?: boolean;
  lockKind?: boolean;
  /** Embedded mode: called after a successful save (e.g. to close the parent accordion). */
  onSaved?: () => void;
}

/** Add or edit a transaction inline (modal-free). */
export function TransactionForm({ action, accounts, categories, transferTargets, defaults, title = "Nuovo movimento", submitLabel = "Salva movimento", embedded, lockKind, onSaved }: TransactionFormProps) {
  const [kind, setKind] = useState<Kind>(defaults.kind);
  const [amount, setAmount] = useState<number | null>(defaults.amountCents ?? null);
  const [fee, setFee] = useState<number | null>(defaults.feeCents ?? null);
  const [planned, setPlanned] = useState(defaults.planned ?? false);
  const [categoryId, setCategoryId] = useState(defaults.categoryId ?? "");
  const [skipEstimates, setSkipEstimates] = useState(defaults.skipEstimates ?? false);
  const [formKey, setFormKey] = useState(0);
  const [open, setOpen] = useState(!!embedded);
  // After saving: close the panel so the outcome is visible, and clear the create form.
  const reset = useCallback(() => {
    if (embedded) return onSaved?.();
    setOpen(false);
    setAmount(null);
    setFee(null);
    setPlanned(false);
    setCategoryId(defaults.categoryId ?? "");
    setSkipEstimates(false);
    setKind(defaults.kind);
    setFormKey((k) => k + 1);
  }, [embedded, onSaved, defaults.kind, defaults.categoryId]);
  const { state, pending, onSubmit, error } = useFormAction(action, reset);

  return (
    <FormPanel
      key={formKey}
      title={title}
      description={embedded ? undefined : "Uscita, entrata, giroconto, bonifico o CBill"}
      icon={embedded ? undefined : <Plus />}
      collapsible={!embedded}
      open={open}
      onOpenChange={setOpen}
      onSubmit={onSubmit}
      className={embedded ? "shadow-none" : undefined}
      actions={
        <Button type="submit" loading={pending} disabled={!amount}>
          {submitLabel}
        </Button>
      }
    >
      <FormMessage state={state} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="amountCents" value={amount ?? ""} />
      <input type="hidden" name="status" value={planned ? "planned" : "booked"} />
      {!lockKind && (
        <SegmentedControl<Kind>
          aria-label="Tipo di movimento"
          className="mio-span-full"
          block
          value={kind}
          onChange={setKind}
          options={MOVEMENT_KIND_OPTIONS}
        />
      )}
      <AmountInput label="Importo" kind={amountKind(kind)} valueCents={amount} onValueChange={setAmount} error={error("amountCents")} className="mio-span-full" />
      {/* The fee row is managed only from here: it is read-only on its own row. */}
      {/* A transfer's fee belongs to its payer: hidden when editing a transfer from an account the viewer cannot see. */}
      {takesFee(kind) && (kind !== "transfer" || !lockKind || accounts.some((a) => a.id === defaults.accountId)) && (
        <FeeInput
          valueCents={fee}
          onValueChange={setFee}
          hint={embedded ? "Svuota il campo per eliminare il movimento delle spese" : "Commissione della banca: diventa un movimento separato"}
          error={error("feeCents")}
        />
      )}
      <TextField name="description" label="Descrizione" placeholder="Es. Esselunga" defaultValue={defaults.description} error={error("description")} required />
      <TextField name="bookedOn" label="Data" type="date" defaultValue={defaults.bookedOn} error={error("bookedOn")} required />
      <Select
        name="accountId"
        label={kind === "transfer" ? "Dal conto" : "Conto"}
        defaultValue={defaults.accountId}
        options={accountOptions(accounts, [], defaults.accountName ? { id: defaults.accountId, name: defaults.accountName } : null)}
        error={error("accountId")}
        disabled={lockKind}
      />
      {lockKind && <input type="hidden" name="accountId" value={defaults.accountId} />}
      {kind === "transfer" ? (
        <>
          <Select
            name="counterpartAccountId"
            label="Al conto"
            defaultValue={defaults.counterpartAccountId ?? ""}
            placeholder="Scegli il conto"
            options={accountOptions(
              accounts,
              transferTargets,
              defaults.counterpartAccountId ? { id: defaults.counterpartAccountId, name: defaults.counterpartName ?? "Conto privato" } : null,
            )}
            error={error("counterpartAccountId")}
            disabled={lockKind}
          />
          {lockKind && <input type="hidden" name="counterpartAccountId" value={defaults.counterpartAccountId ?? ""} />}
        </>
      ) : null}
      <Select
        name="categoryId"
        label="Categoria"
        optional
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={[{ value: "", label: "Nessuna" }, ...toOptions(categories)]}
      />
      <TextField name="notes" label="Note" optional defaultValue={defaults.notes ?? ""} className="mio-span-full" />
      {/* Only categorised income/expenses can reduce a decreasing estimate. */}
      {kind !== "transfer" && categoryId && (
        <>
          <input type="hidden" name="skipEstimates" value={String(skipEstimates)} />
          <Switch
            label="Non scalare dalle stime"
            description="Le stime a scalare della categoria restano invariate"
            checked={skipEstimates}
            onCheckedChange={setSkipEstimates}
            className="mio-span-full"
          />
        </>
      )}
      <Switch
        label="Pianificato"
        description="Non ancora avvenuto: conta solo nelle proiezioni finché non lo registri"
        checked={planned}
        onCheckedChange={setPlanned}
        className="mio-span-full"
      />
    </FormPanel>
  );
}
