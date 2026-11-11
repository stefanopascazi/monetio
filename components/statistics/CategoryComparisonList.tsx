import { Amount, Badge, Card } from "@monetio/ui";
import type { CategoryComparison } from "@/lib/data/statistics";

/** Change worth flagging: at least 15% away from the average. */
const NOTABLE_PCT = 15;

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Badge size="sm">Nuova</Badge>;
  if (Math.abs(pct) < NOTABLE_PCT) return <Badge size="sm">In linea</Badge>;
  return (
    <Badge size="sm" tone={pct > 0 ? "expense" : "income"}>
      {pct > 0 ? `+${pct}%` : `${pct}%`}
    </Badge>
  );
}

/** Spending per category in the last complete month against its usual level. */
export function CategoryComparisonList({ rows, monthLabel, baseMonths }: { rows: CategoryComparison[]; monthLabel: string; baseMonths: number }) {
  return (
    <Card title="Categorie rispetto al solito" subtitle={`${monthLabel} rispetto alla media dei ${baseMonths} mesi precedenti`}>
      {rows.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <li key={r.categoryId ?? "none"} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{r.name}</span>
                <span className="text-xs text-ink-muted">
                  Media <Amount cents={r.averageCents} tone="neutral" size="sm" />
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Amount cents={r.currentCents} tone="neutral" />
                <DeltaBadge pct={r.deltaPct} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">Nessuna spesa registrata nel periodo.</p>
      )}
    </Card>
  );
}
