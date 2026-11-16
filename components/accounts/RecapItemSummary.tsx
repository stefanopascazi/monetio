import { Clock } from "lucide-react";
import { Badge, type BadgeTone } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { RecapItem } from "@/lib/domain/month-recap";
import { isExceeded, isUsedUp, RECAP_SOURCE } from "./recap-source";

/** Label, date and badges of a recap item; `tag` overrides the source badge (e.g. how a rule is booked). */
export function RecapItemSummary({ item, tag }: { item: RecapItem; tag?: { label: string; tone: BadgeTone } | null }) {
  const src = tag ?? RECAP_SOURCE[item.source];
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-semibold">{item.label}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-normal text-ink-muted">
        {item.source === "planned" && <Clock className="size-3.5 shrink-0" aria-label="Pianificato" />}
        {item.overdue ? "In ritardo" : dateLabel(item.date)}
        {src && (
          <Badge size="sm" tone={src.tone}>
            {src.label}
          </Badge>
        )}
        {isUsedUp(item) && (
          <Badge size="sm" tone="expense">
            {isExceeded(item) ? "superata" : "esaurita"}
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
