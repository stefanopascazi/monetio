"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, FormPanel, InlineConfirm, Select, TextField } from "@monetio/ui";
import { archiveCategory, createCategory, updateProfile } from "@/app/actions/settings";
import { CategoryIcon, categoryTint } from "@/components/common/CategoryIcon";
import { CategoryAppearancePicker } from "@/components/settings/CategoryAppearancePicker";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";
import { useToastAction } from "@/hooks/useToastAction";
import type { Category } from "@/lib/domain/types";

/** Own name as shown in the active household. */
export function ProfileForm({ displayName }: { displayName: string }) {
  const { state, pending, onSubmit, error } = useFormAction(updateProfile);
  return (
    <FormPanel title="Profilo" collapsible={false} onSubmit={onSubmit} actions={<Button type="submit" loading={pending}>Salva</Button>}>
      <FormMessage state={state} />
      <TextField name="displayName" label="Il tuo nome nel nucleo" defaultValue={displayName} error={error("displayName")} required className="mio-span-full" />
    </FormPanel>
  );
}

const KIND_LABEL = { expense: "Uscite", income: "Entrate", both: "Entrambe" } as const;

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [formKey, setFormKey] = useState(0);
  const { state, pending, onSubmit, error } = useFormAction(createCategory, () => setFormKey((k) => k + 1));
  const { run } = useToastAction();
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
        <CategoryAppearancePicker />
      </FormPanel>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-4 py-2">
            <span className="flex items-center gap-3">
              <span
                className="inline-flex size-8 items-center justify-center rounded-full [&>svg]:size-4"
                style={categoryTint(c.colorIndex)}
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
              onConfirm={() => run(() => archiveCategory(c.id))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
