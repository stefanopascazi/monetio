import { Badge } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { RecapItem } from "@/lib/domain/month-recap";
import { isUsedUp, RECAP_SOURCE } from "./recap-source";

/** Label, date and badges of a recap item. */
export function RecapItemSummary({ item }: { item: RecapItem }) {
  const src = RECAP_SOURCE[item.source];
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-semibold">{item.label}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-normal text-ink-muted">
        {item.overdue ? "In ritardo" : dateLabel(item.date)}
        {src && (
          <Badge size="sm" tone={src.tone}>
            {src.label}
          </Badge>
        )}
        {isUsedUp(item) && (
          <Badge size="sm" tone="expense">
            esaurita
          </Badge>
        )}
        {item.overdue && (
          <Badge size="sm" tone="expense">
            arretrato
          </Badge>
        )}
      </span>
    </span>
  );
}
