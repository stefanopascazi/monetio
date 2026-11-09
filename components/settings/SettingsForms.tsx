"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, FormPanel, TextField } from "@monetio/ui";
import { createCategory, updateProfile } from "@/app/actions/settings";
import { CategoryFields } from "@/components/settings/CategoryFields";
import { CategoryItem } from "@/components/settings/CategoryItem";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";
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

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [formKey, setFormKey] = useState(0);
  const reset = useCallback(() => setFormKey((k) => k + 1), []);
  const { state, pending, onSubmit, error } = useFormAction(createCategory, reset);
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
        <CategoryFields error={error} />
      </FormPanel>
      <ul className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <CategoryItem key={c.id} category={c} />
        ))}
      </ul>
    </div>
  );
}
