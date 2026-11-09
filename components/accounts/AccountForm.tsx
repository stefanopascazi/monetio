"use client";

import { Lock, Plus, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { AmountInput, Button, FormPanel, SegmentedControl, Select, Switch, TextField } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";
import { FormMessage } from "@/components/common/FormMessage";
import { ACCOUNT_TYPE_LABEL, enumOptions } from "@/components/common/options";
import { useFormAction } from "@/hooks/useFormAction";
import type { AccountType, Visibility } from "@/lib/domain/types";

export interface AccountDefaults {
  name?: string;
  institution?: string | null;
  type?: AccountType;
  visibility?: Visibility;
  openingBalanceCents?: number;
  openingDate: string;
}

export interface AccountFormProps {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: AccountDefaults;
  embedded?: boolean;
  /** False when the viewer is not the owner and cannot make it private. */
  canMakePrivate?: boolean;
  /** Embedded mode: called after a successful save (e.g. to close the parent accordion). */
  onSaved?: () => void;
  /** Create mode: start expanded (e.g. opened from the account switcher). */
  initiallyOpen?: boolean;
  /** Create mode: called when the panel closes, after saving or by the user. */
  onClosed?: () => void;
  /** Create form without panel chrome, for hosts that already show a title (modal). */
  plain?: boolean;
}

export function AccountForm({ action, defaults, embedded, canMakePrivate = true, onSaved, initiallyOpen, onClosed, plain }: AccountFormProps) {
  const [visibility, setVisibility] = useState<Visibility>(defaults.visibility ?? "shared");
  const [opening, setOpening] = useState<number | null>(defaults.openingBalanceCents ? Math.abs(defaults.openingBalanceCents) : null);
  const [negative, setNegative] = useState((defaults.openingBalanceCents ?? 0) < 0);
  const [open, setOpen] = useState(!!embedded || !!initiallyOpen || !!plain);
  const [formKey, setFormKey] = useState(0);
  // After saving: close the panel so the outcome is visible, and clear the create form.
  const reset = useCallback(() => {
    if (embedded) return onSaved?.();
    setOpen(false);
    setOpening(null);
    setNegative(false);
    setVisibility("shared");
    setFormKey((k) => k + 1);
    onClosed?.();
  }, [embedded, onSaved, onClosed]);
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClosed?.();
  };
  const { state, pending, onSubmit, error } = useFormAction(action, reset);

  return (
    <FormPanel
      key={formKey}
      title={embedded ? "Impostazioni conto" : "Nuovo conto"}
      description={embedded ? undefined : "Conto corrente, risparmio, investimenti o contanti"}
      icon={embedded ? undefined : <Plus />}
      collapsible={!embedded && !plain}
      plain={embedded || plain}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      actions={
        <Button type="submit" loading={pending}>
          {embedded ? "Salva conto" : "Crea conto"}
        </Button>
      }
    >
      <FormMessage state={state} />
      <input type="hidden" name="visibility" value={visibility} />
      <input type="hidden" name="openingBalanceCents" value={opening ?? 0} />
      <input type="hidden" name="openingNegative" value={String(negative)} />
      <TextField name="name" label="Nome" placeholder="Es. Conto cointestato" defaultValue={defaults.name} error={error("name")} required />
      <TextField name="institution" label="Banca" optional placeholder="Es. Intesa Sanpaolo" defaultValue={defaults.institution ?? ""} />
      <Select name="type" label="Tipo" defaultValue={defaults.type ?? "checking"} options={enumOptions(ACCOUNT_TYPE_LABEL)} error={error("type")} />
      <TextField name="openingDate" label="Data saldo iniziale" type="date" defaultValue={defaults.openingDate} error={error("openingDate")} required />
      <AmountInput label="Saldo iniziale" kind="neutral" valueCents={opening} onValueChange={setOpening} hint="Saldo alla data indicata" />
      <Switch label="Saldo negativo" checked={negative} onCheckedChange={setNegative} />
      <div className="mio-span-full flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">Chi può vederlo</span>
        <SegmentedControl<Visibility>
          aria-label="Visibilità"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "shared", label: "Tutto il nucleo", icon: <Users aria-hidden="true" /> },
            ...(canMakePrivate ? [{ value: "private" as const, label: "Solo io", icon: <Lock aria-hidden="true" /> }] : []),
          ]}
        />
      </div>
    </FormPanel>
  );
}
