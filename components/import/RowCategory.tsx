"use client";

import { categoriesFor, type CategoryOption } from "./import-view";

export interface RowCategoryProps {
  amountCents: number;
  value: string;
  suggested: boolean;
  categories: CategoryOption[];
  onChange: (categoryId: string) => void;
  label: string;
}

/** Compact category picker of one preview row; flags a suggested value. */
export function RowCategory({ amountCents, value, suggested, categories, onChange, label }: RowCategoryProps) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-full rounded-full border border-border bg-surface px-2 py-1 text-xs font-semibold text-ink"
      >
        <option value="">Senza categoria</option>
        {categoriesFor(amountCents, categories).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {suggested && value && <span className="text-ink-muted">proposta</span>}
    </span>
  );
}
