import { Amount } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import type { AccountBaseline, AccountMonthlySummary } from "@/lib/domain/baseline";

const fmt = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0, signDisplay: "always" });

/** How a typical projected month is built, per account. */
export function ProjectionBreakdown({
  accounts,
  summary,
  baseline,
  categories,
}: {
  accounts: NamedRef[];
  summary: Record<string, AccountMonthlySummary>;
  baseline: Record<string, AccountBaseline>;
  categories: NamedRef[];
}) {
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Senza categoria";
  const cols: { key: keyof AccountMonthlySummary; label: string; sign: 1 | -1 }[] = [
    { key: "rulesIncomeCents", label: "Entrate ricorrenti", sign: 1 },
    { key: "variableIncomeCents", label: "Entrate medie", sign: 1 },
    { key: "rulesExpenseCents", label: "Uscite fisse", sign: -1 },
    { key: "variableExpenseCents", label: "Spese medie", sign: -1 },
    { key: "transfersCents", label: "Giroconti e quote", sign: 1 },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-ink-muted">
            <th scope="col" className="px-5 py-3 font-medium">
              Conto
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className="px-3 py-3 text-right font-medium">
                {c.label}
              </th>
            ))}
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Netto al mese
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => {
            const s = summary[a.id];
            if (!s) return null;
            const top = (baseline[a.id]?.categories ?? []).slice(0, 4);
            return (
              <tr key={a.id} className="border-t border-[var(--mio-border)] align-top">
                <th scope="row" className="px-5 py-3 text-left font-medium">
                  <span className="flex flex-col gap-1">
                    <span>{a.name}</span>
                    {top.length > 0 && (
                      <span className="text-xs font-normal text-ink-muted">
                        Medie: {top.map((c) => `${catName(c.categoryId)} ${fmt.format(c.avgCents / 100)}`).join(" · ")}
                      </span>
                    )}
                  </span>
                </th>
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-3 text-right">
                    {s[c.key] ? <Amount cents={c.sign * s[c.key]} tone={c.key === "transfersCents" ? "transfer" : "auto"} size="sm" showSign /> : <span className="text-ink-subtle">—</span>}
                  </td>
                ))}
                <td className="px-5 py-3 text-right">
                  <Amount cents={s.netCents} tone={s.netCents < 0 ? "expense" : "income"} size="sm" showSign />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
