"use client";

import { useState } from "react";
import { Amount, Button } from "@monetio/ui";
import { assignGroupCategory } from "@/app/actions/category-matches";
import type { CategoryOption } from "@/components/import/import-view";
import { RowCategory } from "@/components/import/RowCategory";
import { useToastAction } from "@/hooks/useToastAction";
import type { UncategorisedGroup } from "@/lib/import/matches";

const groupId = (g: UncategorisedGroup) => `${g.direction}|${g.key}`;

/** Uncategorised movements grouped by identical description; a category goes to the whole group. */
export function UncategorisedGroups({ accountId, groups, categories }: { accountId: string; groups: UncategorisedGroup[]; categories: CategoryOption[] }) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const { pending, run } = useToastAction();
  if (!groups.length) return <p className="px-4 py-3 text-sm text-ink-muted">Tutti i movimenti del conto hanno una categoria.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {groups.map((g) => {
        const id = groupId(g);
        const value = picks[id] ?? "";
        return (
          <li key={id} className="flex flex-col gap-2 px-4 py-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="break-words">{g.description}</span>
                <span className="text-xs text-ink-muted">{g.count === 1 ? "1 movimento" : `${g.count} movimenti`}</span>
              </span>
              <Amount cents={g.totalCents} size="sm" showSign />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RowCategory
                amountCents={g.direction}
                value={value}
                suggested={false}
                categories={categories}
                disabled={pending}
                label={`Categoria per ${g.description}`}
                onChange={(categoryId) => setPicks((p) => ({ ...p, [id]: categoryId }))}
              />
              <Button size="sm" variant="secondary" disabled={pending || !value} onClick={() => run(() => assignGroupCategory(accountId, g.description, g.direction, value))}>
                Assegna
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
