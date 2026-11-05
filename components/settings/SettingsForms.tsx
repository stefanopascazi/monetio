"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, Button, FormPanel, InlineConfirm, Select, TextField } from "@monetio/ui";
import { archiveCategory, createCategory, updateProfile } from "@/app/actions/settings";
import type { ActionState } from "@/app/actions/state";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/common/CategoryIcon";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";
import type { Category } from "@/lib/domain/types";

export function ProfileForm({ displayName, householdName }: { displayName: string; householdName: string }) {
  const { state, pending, onSubmit } = useFormAction(updateProfile);
  return (
    <FormPanel title="Profilo e nucleo" collapsible={false} onSubmit={onSubmit} actions={<Button type="submit" loading={pending}>Salva</Button>}>
      <FormMessage state={state} />
      <TextField name="displayName" label="Il tuo nome" defaultValue={displayName} required />
      <TextField name="householdName" label="Nome del nucleo" defaultValue={householdName} required />
    </FormPanel>
  );
}

const KIND_LABEL = { expense: "Uscite", income: "Entrate", both: "Entrambe" } as const;

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [formKey, setFormKey] = useState(0);
  const { state, pending, onSubmit, error } = useFormAction(createCategory, () => setFormKey((k) => k + 1));
  const [result, setResult] = useState<ActionState | null>(null);
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <FormPanel
        key={formKey}
        title="Nuova categoria"
        icon={<Plus />}
        defaultOpen={false}
        onSubmit={onSubmit}
        actions={<Button type="submit" loading={pending}>Aggiungi categoria</Button>}
      >
        <FormMessage state={state} />
        <TextField name="name" label="Nome" placeholder="Es. Vacanze" error={error("name")} required />
        <Select name="kind" label="Usata per" defaultValue="expense" options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} />
        <Select name="icon" label="Icona" defaultValue="sparkles" options={CATEGORY_ICON_NAMES.map((n) => ({ value: n, label: n }))} />
        <Select name="colorIndex" label="Colore" defaultValue="1" options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `Colore ${n}` }))} />
      </FormPanel>
      {result?.message && <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert>}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-4 py-2">
            <span className="flex items-center gap-3">
              <span
                className="inline-flex size-8 items-center justify-center rounded-full [&>svg]:size-4"
                style={{ background: `color-mix(in srgb, var(--mio-chart-${c.colorIndex}) 18%, transparent)`, color: `var(--mio-chart-${c.colorIndex})` }}
              >
                <CategoryIcon name={c.icon} />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-ink-muted">{KIND_LABEL[c.kind]}</span>
              </span>
            </span>
            <InlineConfirm
              triggerLabel="Archivia"
              triggerIcon={<Trash2 />}
              message="Archivio la categoria? I movimenti la mantengono."
              confirmLabel="Archivia"
              onConfirm={() => start(async () => setResult(await archiveCategory(c.id)))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
