"use client";

import { Amount, Badge } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import { REVIEW_REASON_LABEL } from "@/lib/banking/reviews";
import type { CategoryOption } from "@/components/import/import-view";
import { RowCategory } from "@/components/import/RowCategory";
import { isSelectable, type PreviewGroup, type PreviewItem } from "@/lib/banking/sync/preview";

const GROUPS: { group: PreviewGroup; title: string; hint: string }[] = [
  { group: "new", title: "Nuovi", hint: "Non trovati in MonetIO: quelli spuntati vengono aggiunti. La categoria scelta vale anche per i movimenti uguali e il conto la ricorda." },
  { group: "review", title: "Da rivedere", hint: "Simili a movimenti già registrati: quelli spuntati finiscono in \"Da rivedere\"." },
  { group: "matched", title: "Già presenti", hint: "Abbinati a movimenti registrati: ricevono solo il riferimento della banca." },
  { group: "known", title: "Già sincronizzati", hint: "Nessuna modifica." },
];

type Props = {
  items: PreviewItem[];
  selected: ReadonlySet<string>;
  onToggle: (ref: string, value: boolean) => void;
  /** Categories for new movements; without them no picker is shown. */
  categories?: CategoryOption[];
  /** Refs whose category the owner picked (others come from the account matches). */
  picked?: ReadonlySet<string>;
  onPickCategory?: (ref: string, categoryId: string | null) => void;
  disabled?: boolean;
};

/** Movements of the first-sync preview, grouped; new and doubtful ones carry a checkbox. */
export function BankPreviewList({ items, selected, onToggle, categories, picked, onPickCategory, disabled }: Props) {
  if (!items.length) return <p className="text-sm text-ink-muted">La banca non ha movimenti da questa data.</p>;
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map(({ group, title, hint }) => {
        const rows = items.filter((i) => i.group === group);
        if (!rows.length) return null;
        return (
          <section key={group} className="flex flex-col gap-2" aria-label={title}>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{title}</h4>
              <Badge size="sm" tone={group === "review" ? "warning" : "neutral"}>
                {rows.length}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted">{hint}</p>
            <ul className="flex flex-col divide-y divide-border rounded-[14px] bg-surface">
              {rows.map((i) => (
                <li key={i.ref} className="flex items-start gap-3 px-3 py-2 text-sm">
                  {isSelectable(i) && (
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-brand"
                      checked={selected.has(i.ref)}
                      disabled={disabled}
                      onChange={(e) => onToggle(i.ref, e.target.checked)}
                      aria-label={`Importa ${i.description} del ${dateLabel(i.bookedOn)}`}
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{i.description}</span>
                    <span className="text-xs text-ink-muted">
                      {dateLabel(i.bookedOn)}
                      {i.reason ? ` · ${REVIEW_REASON_LABEL[i.reason]}` : ""}
                    </span>
                    {i.group === "new" && categories && onPickCategory && (
                      <span className="mt-1">
                        <RowCategory
                          amountCents={i.amountCents}
                          value={i.categoryId ?? ""}
                          suggested={!picked?.has(i.ref)}
                          suggestedLabel="dal conto"
                          categories={categories}
                          disabled={disabled}
                          label={`Categoria di ${i.description} del ${dateLabel(i.bookedOn)}`}
                          onChange={(id) => onPickCategory(i.ref, id || null)}
                        />
                      </span>
                    )}
                  </span>
                  <Amount cents={i.amountCents} size="sm" showSign />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
