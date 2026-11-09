"use client";

import { RotateCcw } from "lucide-react";
import { Button, Card } from "@monetio/ui";
import { restoreCategory } from "@/app/actions/settings";
import { CategoryIcon, categoryTint } from "@/components/common/CategoryIcon";
import { useToastAction } from "@/hooks/useToastAction";
import type { Category } from "@/lib/domain/types";
import { KIND_LABEL } from "./CategoryFields";

/** Archived categories, folded by default, each one restorable. */
export function ArchivedCategories({ categories }: { categories: Category[] }) {
  const { run, pending } = useToastAction();
  if (!categories.length) return null;
  return (
    <Card title={`Archiviate (${categories.length})`} subtitle="Non si possono scegliere nei nuovi movimenti finché non le ripristini" collapsible defaultOpen={false}>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-sunken px-4 py-2">
            <span className="flex min-w-0 items-center gap-3 opacity-70">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full [&>svg]:size-4" style={categoryTint(c.colorIndex)}>
                <CategoryIcon name={c.icon} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{c.name}</span>
                <span className="text-xs text-ink-muted">{KIND_LABEL[c.kind]}</span>
              </span>
            </span>
            <Button variant="ghost" size="sm" iconStart={<RotateCcw />} disabled={pending} onClick={() => run(() => restoreCategory(c.id))}>
              Ripristina
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
