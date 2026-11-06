import Link from "next/link";
import { Button, TextField } from "@monetio/ui";
import type { StatementPeriod } from "@/lib/data/statement-period";

/**
 * GET forms: month or exact dates, kept in the URL. Reset link back to the latest rows.
 * Layout follows the card width (container queries), not the viewport: the card is narrow in the two-column layout.
 */
export function StatementFilters({ basePath, period }: { basePath: string; period: StatementPeriod }) {
  const month = period.kind === "month" ? period.month : "";
  const from = period.kind === "range" ? period.from : "";
  const to = period.kind === "range" ? period.to : "";
  return (
    <div className="@container flex flex-col gap-3 border-b border-[var(--mio-border)] px-5 py-4">
      <div data-testid="statement-filters" className="grid grid-cols-1 items-end gap-3 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form method="get" action={basePath} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3" aria-label="Filtra per mese">
          <TextField name="mese" type="month" label="Mese" defaultValue={month} required />
          <Button type="submit" variant="secondary">
            Vai
          </Button>
        </form>
        <form method="get" action={basePath} className="grid grid-cols-1 items-end gap-3 @md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" aria-label="Filtra per date">
          <TextField name="da" type="date" label="Da" defaultValue={from} />
          <TextField name="a" type="date" label="A" defaultValue={to} />
          <Button type="submit" variant="secondary">
            Filtra
          </Button>
        </form>
      </div>
      {period.kind !== "recent" && (
        <Link href={basePath} className="self-start text-sm font-semibold text-brand-ink hover:underline">
          Mostra gli ultimi movimenti
        </Link>
      )}
    </div>
  );
}
