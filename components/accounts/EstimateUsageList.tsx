import { Amount, formatMoney } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { EstimateUsage } from "@/lib/domain/estimates";

/** Booked movements that reduced a decreasing estimate this month. */
export function EstimateUsageList({ usage }: { usage: EstimateUsage }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-ink-muted">
        Usati {formatMoney(usage.usedCents)} di {formatMoney(usage.totalCents)}
      </p>
      {usage.parts.length === 0 ? (
        <p className="text-ink-muted">Nessun movimento ha ancora ridotto la stima.</p>
      ) : (
        <ul aria-label="Movimenti della stima" className="flex flex-col gap-1.5">
          {usage.parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{p.description || "Movimento"}</span>
                <span className="text-ink-muted">{dateLabel(p.bookedOn)}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <Amount cents={p.amountCents} size="sm" showSign />
                {/* Only part of the movement went into this estimate. */}
                {p.amountCents !== p.movementCents && <span className="text-ink-muted">di {formatMoney(p.movementCents)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
