import { Repeat } from "lucide-react";
import { EmptyState } from "@monetio/ui";
import { AmountWithFee } from "@/components/payments/AmountWithFee";
import { dateLabel } from "@/lib/domain/dates";
import type { DueView } from "./DueList";

/** Read-only list of upcoming automatic movements. */
export function UpcomingList({ items }: { items: DueView[] }) {
  if (!items.length) return <EmptyState icon={<Repeat />} title="Nessun addebito automatico" description="Nei prossimi 31 giorni non ci sono ricorrenze automatiche." />;
  return (
    <ul className="divide-y divide-[var(--mio-border)]">
      {items.map((e) => (
        <li key={e.key} className="flex items-center justify-between gap-3 px-5 py-3">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{e.description}</span>
            <span className="truncate text-sm text-ink-muted">
              {dateLabel(e.date)} · {e.accountName}
            </span>
          </span>
          <AmountWithFee cents={e.amountCents} feeCents={e.feeCents} />
        </li>
      ))}
    </ul>
  );
}
