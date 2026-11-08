"use client";

import { useState } from "react";
import { Chip, Switch } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";

export interface DecreasingEstimateFieldsProps {
  categories: NamedRef[];
  /** Saved categories of the rule: the estimate starts as decreasing when there are any. */
  initial?: string[];
  error?: string;
}

/** Opt-in for estimates reduced by the movements booked in the month in some categories. */
export function DecreasingEstimateFields({ categories, initial = [], error }: DecreasingEstimateFieldsProps) {
  const [on, setOn] = useState(initial.length > 0);
  const [cats, setCats] = useState<string[]>(initial);
  const toggle = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <div className="mio-span-full flex flex-col gap-3">
      <input type="hidden" name="decreasing" value={String(on)} />
      <Switch
        label="A scalare"
        description="I movimenti registrati nel mese sul conto, nelle categorie scelte, riducono la stima"
        checked={on}
        onCheckedChange={setOn}
      />
      {on && (
        <div className="flex flex-col gap-2">
          {cats.map((id) => (
            <input key={id} type="hidden" name="decrementCategoryIds" value={id} />
          ))}
          <span className="text-sm font-medium text-ink-muted">Categorie da scalare</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Chip key={cat.id} type="button" selected={cats.includes(cat.id)} onSelectedChange={() => toggle(cat.id)}>
                {cat.name}
              </Chip>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
