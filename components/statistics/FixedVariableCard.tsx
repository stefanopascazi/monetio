import { Amount, Card } from "@monetio/ui";

/** Share of the spending already committed (rules and quotas) versus spending decided day by day. */
export function FixedVariableCard({ fixedCents, variableCents }: { fixedCents: number; variableCents: number }) {
  const total = fixedCents + variableCents;
  const fixedPct = total ? Math.round((fixedCents / total) * 100) : 0;
  return (
    <Card title="Spese fisse e variabili" subtitle="Fisse: ricorrenze, quote e spese nelle loro categorie. Variabili: tutto il resto.">
      {total ? (
        <div className="flex flex-col gap-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-expense-soft" role="img" aria-label={`Spese fisse ${fixedPct}%, variabili ${100 - fixedPct}%`}>
            <div className="bg-forecast" style={{ width: `${fixedPct}%` }} />
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-ink-muted">Fisse · {fixedPct}%</dt>
              <dd>
                <Amount cents={fixedCents} tone="neutral" size="lg" />
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-ink-muted">Variabili · {100 - fixedPct}%</dt>
              <dd>
                <Amount cents={variableCents} tone="neutral" size="lg" />
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Nessuna spesa registrata nel periodo.</p>
      )}
    </Card>
  );
}
