"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, FormPanel, InlineConfirm } from "@monetio/ui";
import { archiveCategory, updateCategory } from "@/app/actions/settings";
import { CategoryIcon, categoryTint } from "@/components/common/CategoryIcon";
import { useFormAction } from "@/hooks/useFormAction";
import { useToastAction } from "@/hooks/useToastAction";
import type { Category } from "@/lib/domain/types";
import { CategoryFields, KIND_LABEL } from "./CategoryFields";

/** One category row with inline edit and archive. */
export function CategoryItem({ category: c }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);
  const { pending, onSubmit, error } = useFormAction(updateCategory.bind(null, c.id), close);
  const { run } = useToastAction();

  return (
    <li className="flex flex-col gap-3 rounded-[14px] bg-surface px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full [&>svg]:size-4" style={categoryTint(c.colorIndex)}>
            <CategoryIcon name={c.icon} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{c.name}</span>
            <span className="text-xs text-ink-muted">{KIND_LABEL[c.kind]}</span>
          </span>
        </span>
        <Button variant="ghost" size="sm" iconStart={<Pencil />} aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          {editing ? "Chiudi" : "Modifica"}
        </Button>
      </div>
      {editing && (
        <>
          <FormPanel plain title={`Modifica ${c.name}`} onSubmit={onSubmit} actions={<Button type="submit" loading={pending}>Salva modifiche</Button>}>
            <CategoryFields defaults={c} error={error} />
          </FormPanel>
          <InlineConfirm
            triggerLabel="Archivia"
            triggerIcon={<Trash2 />}
            message="Archivio la categoria? Sparisce dalle scelte; i movimenti già registrati restano."
            confirmLabel="Archivia"
            onConfirm={() => run(() => archiveCategory(c.id))}
          />
        </>
      )}
    </li>
  );
}
