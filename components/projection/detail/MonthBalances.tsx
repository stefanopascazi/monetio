import { Amount } from "@monetio/ui";

interface Balances {
  openingCents: number;
  netCents: number;
  closingCents: number;
}

const closingTone = (cents: number) => (cents < 0 ? "expense" : "neutral");

/** Collapsed accordion row: opening and net under the month name. */
export function MonthSubtitle({ openingCents, netCents }: Omit<Balances, "closingCents">) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-normal text-ink-muted">
      Inizio <Amount cents={openingCents} tone="neutral" size="sm" />
      <span aria-hidden="true">·</span>
      Mese <Amount cents={netCents} size="sm" showSign />
    </span>
  );
}

/** Collapsed accordion row: month-end balance, the figure that matters most. */
export function MonthClosing({ closingCents }: Pick<Balances, "closingCents">) {
  return (
    <span className="flex flex-col items-end">
      <span className="text-xs text-ink-muted">Fine mese</span>
      <Amount cents={closingCents} tone={closingTone(closingCents)} size="lg" />
    </span>
  );
}

/** Opened month: opening, net and the highlighted month-end balance. */
export function MonthBalances({ openingCents, netCents, closingCents }: Balances) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1 rounded-lg border border-[var(--mio-border)] px-4 py-3">
        <dt className="text-sm text-ink-muted">Saldo iniziale</dt>
        <dd>
          <Amount cents={openingCents} tone="neutral" size="md" />
        </dd>
      </div>
      <div className="flex flex-col gap-1 rounded-lg border border-[var(--mio-border)] px-4 py-3">
        <dt className="text-sm text-ink-muted">Variazione del mese</dt>
        <dd>
          <Amount cents={netCents} size="md" showSign />
        </dd>
      </div>
      <div className="flex flex-col gap-1 rounded-lg border-2 border-brand bg-surface-raised px-4 py-3">
        <dt className="text-sm font-semibold text-ink">Saldo a fine mese</dt>
        <dd>
          <Amount cents={closingCents} tone={closingTone(closingCents)} size="xl" />
        </dd>
      </div>
    </dl>
  );
}
