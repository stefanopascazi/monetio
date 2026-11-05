"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { AmountInput, Button, Chip, FormPanel, Select, Switch, TextField } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/common/FormMessage";
import { type NamedRef, toOptions } from "@/components/common/options";
import { useFormAction } from "@/hooks/useFormAction";
import type { ContributionRule } from "@/lib/domain/types";

export interface ContributionFormProps {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  accounts: NamedRef[];
  categories: NamedRef[];
  contribution?: ContributionRule;
}

/** Monthly quota towards a shared account: fixed part + share of the shared spending. */
export function ContributionForm({ action, accounts, categories, contribution: c }: ContributionFormProps) {
  const embedded = !!c;
  const [fixed, setFixed] = useState<number | null>(c?.fixedCents ?? null);
  const [estimate, setEstimate] = useState<number | null>(c?.estimatedSpendingCents ?? null);
  const [cats, setCats] = useState<string[]>(c?.categoryIds ?? []);
  const [active, setActive] = useState(c?.active ?? true);
  const [open, setOpen] = useState(embedded);
  const [formKey, setFormKey] = useState(0);
  const reset = useCallback(() => {
    if (embedded) return;
    setFixed(null);
    setEstimate(null);
    setCats([]);
    setFormKey((k) => k + 1);
  }, [embedded]);
  const { state, pending, onSubmit, error } = useFormAction(action, reset);
  const toggle = (id: string) => setCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <FormPanel
      key={formKey}
      title={embedded ? "Modifica quota" : "Nuova quota automatica"}
      description={embedded ? undefined : "Es. 800 € fissi + metà della spesa del cointestato"}
      icon={embedded ? undefined : <Plus />}
      collapsible={!embedded}
      open={open}
      onOpenChange={setOpen}
      onSubmit={onSubmit}
      actions={
        <Button type="submit" loading={pending}>
          {embedded ? "Salva quota" : "Aggiungi quota"}
        </Button>
      }
    >
      <FormMessage state={state} />
      <input type="hidden" name="fixedCents" value={fixed ?? 0} />
      <input type="hidden" name="estimatedSpendingCents" value={estimate ?? 0} />
      <input type="hidden" name="active" value={String(active)} />
      {cats.map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} />
      ))}
      <TextField name="description" label="Descrizione" placeholder="Es. Quota mensile Ste" defaultValue={c?.description} error={error("description")} required className="mio-span-full" />
      <Select name="fromAccountId" label="Dal conto" defaultValue={c?.fromAccountId ?? ""} placeholder="Scegli il conto" options={toOptions(accounts)} error={error("fromAccountId")} />
      <Select name="toAccountId" label="Al conto" defaultValue={c?.toAccountId ?? ""} placeholder="Scegli il conto" options={toOptions(accounts)} error={error("toAccountId")} />
      <AmountInput label="Quota fissa" kind="transfer" valueCents={fixed} onValueChange={setFixed} error={error("fixedCents")} />
      <TextField name="sharePercent" label="Percentuale delle spese condivise" type="number" min={0} max={100} step="0.01" suffix="%" defaultValue={c?.sharePercent ?? 50} error={error("sharePercent")} />
      <div className="mio-span-full flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">Categorie da dividere</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Chip key={cat.id} type="button" selected={cats.includes(cat.id)} onSelectedChange={() => toggle(cat.id)}>
              {cat.name}
            </Chip>
          ))}
        </div>
        {error("categoryIds") && <p className="text-sm text-danger">{error("categoryIds")}</p>}
      </div>
      <TextField name="dayOfMonth" label="Giorno del versamento" type="number" min={1} max={31} defaultValue={c?.dayOfMonth ?? 28} error={error("dayOfMonth")} />
      <AmountInput label="Spesa condivisa stimata al mese" kind="neutral" valueCents={estimate} onValueChange={setEstimate} hint="Usata per le proiezioni dei mesi futuri" />
      {embedded && <Switch label="Attiva" checked={active} onCheckedChange={setActive} className="mio-span-full" />}
    </FormPanel>
  );
}
