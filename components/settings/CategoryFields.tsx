"use client";

import { Select, TextField } from "@monetio/ui";
import type { Category } from "@/lib/domain/types";
import { CategoryAppearancePicker } from "./CategoryAppearancePicker";

export const KIND_LABEL: Record<Category["kind"], string> = { expense: "Uscite", income: "Entrate", both: "Entrambe" };

/** Shared category inputs for the create and edit forms. */
export function CategoryFields({ defaults, error }: { defaults?: Category; error: (field: string) => string | undefined }) {
  return (
    <>
      <TextField name="name" label="Nome" placeholder="Es. Vacanze" defaultValue={defaults?.name} error={error("name")} required />
      <Select
        name="kind"
        label="Usata per"
        defaultValue={defaults?.kind ?? "expense"}
        options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))}
      />
      <CategoryAppearancePicker defaultIcon={defaults?.icon ?? undefined} defaultColor={defaults?.colorIndex} />
    </>
  );
}
