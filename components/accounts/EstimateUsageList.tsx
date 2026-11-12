import { Amount, formatMoney } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import { type EstimateUsage, spentCents } from "@/lib/domain/estimates";

/** Booked movements that reduced a decreasing estimate this month, overflow included. */
export function EstimateUsageList({ usage }: { usage: EstimateUsage }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-ink-muted">
        Usati {formatMoney(spentCents(usage))} di {formatMoney(usage.totalCents)}
        {usage.overCents > 0 && <span className="text-danger"> · oltre la stima di {formatMoney(usage.overCents)}</span>}
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
