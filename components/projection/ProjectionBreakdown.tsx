"use client";

import { Amount } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import type { AccountMonthlySummary } from "@/lib/domain/monthly-summary";
import { visibleAccounts } from "./account/account-filter";
import { useProjectionAccount } from "./account/ProjectionAccountContext";

/** How a typical projected month is built, per selected account. */
export function ProjectionBreakdown({ accounts: all, summary }: { accounts: NamedRef[]; summary: Record<string, AccountMonthlySummary> }) {
  const accounts = visibleAccounts(all, useProjectionAccount().selected);
  const cols: { key: keyof AccountMonthlySummary; label: string; sign: 1 | -1 }[] = [
    { key: "rulesIncomeCents", label: "Entrate ricorrenti", sign: 1 },
    { key: "rulesExpenseCents", label: "Uscite fisse", sign: -1 },
    { key: "transfersCents", label: "Giroconti e quote", sign: 1 },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
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
            return (
              <tr key={a.id} className="border-t border-[var(--mio-border)] align-top">
                <th scope="row" className="px-5 py-3 text-left font-medium">
                  {a.name}
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
