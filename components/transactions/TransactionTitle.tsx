import { Clock, Repeat } from "lucide-react";
import { dateLabel } from "@/lib/domain/dates";
import type { TxnView } from "@/lib/data/views";
import { CategoryIcon } from "@/components/common/CategoryIcon";

/** Compact transaction summary used as an accordion title (phrasing content only). */
export function TransactionTitle({ t, showAccount = true }: { t: TxnView; showAccount?: boolean }) {
  const meta = [
    t.categoryName ?? (t.isTransfer ? "Giroconto" : t.kind === "adjustment" ? "Rettifica" : null),
    t.isTransfer && t.counterpartName ? `${t.amountCents < 0 ? "verso" : "da"} ${t.counterpartName}` : null,
    showAccount ? t.accountName : null,
    dateLabel(t.bookedOn),
  ].filter(Boolean);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full [&>svg]:size-[18px]"
        style={{ background: `color-mix(in srgb, var(--mio-chart-${t.colorIndex}) 18%, transparent)`, color: `var(--mio-chart-${t.colorIndex})` }}
      >
        <CategoryIcon name={t.categoryIcon} />
      </span>
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate font-semibold text-ink">{t.description}</span>
        <span className="flex items-center gap-1 truncate text-sm font-normal text-ink-muted">
          {t.recurring && <Repeat className="size-3.5 shrink-0" aria-label="Ricorrente" />}
          {t.status === "planned" && <Clock className="size-3.5 shrink-0" aria-label="Pianificato" />}
          <span className="truncate">{meta.join(" · ")}</span>
        </span>
      </span>
    </span>
  );
}
