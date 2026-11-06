import Link from "next/link";
import { Button, TextField } from "@monetio/ui";
import type { StatementPeriod } from "@/lib/data/statement-period";

/** GET forms: month or exact dates, kept in the URL. Reset link back to the latest rows. */
export function StatementFilters({ basePath, period }: { basePath: string; period: StatementPeriod }) {
  const month = period.kind === "month" ? period.month : "";
  const from = period.kind === "range" ? period.from : "";
  const to = period.kind === "range" ? period.to : "";
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--mio-border)] px-5 py-4">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr_1fr_auto]">
        <form method="get" action={basePath} className="contents" aria-label="Filtra per mese">
          <TextField name="mese" type="month" label="Mese" defaultValue={month} required />
          <Button type="submit" variant="secondary">
            Vai
          </Button>
        </form>
        <form method="get" action={basePath} className="contents" aria-label="Filtra per date">
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
