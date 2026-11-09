"use client";

import { Amount } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { monthLabel } from "@/lib/domain/dates";
import type { ProjectionMonth } from "@/lib/domain/projection";
import { ALL_ACCOUNTS, visibleAccounts } from "./account/account-filter";
import { useProjectionAccount } from "./account/ProjectionAccountContext";

/** Month-end balances per selected account; long horizons show one row per quarter end. */
export function ProjectionTable({ projection, accounts: all }: { projection: ProjectionMonth[]; accounts: NamedRef[] }) {
  const { selected } = useProjectionAccount();
  const accounts = visibleAccounts(all, selected);
  // A single account column already is the total.
  const showTotal = selected === ALL_ACCOUNTS || accounts.length > 1;
  const rows = projection.length > 24 ? projection.filter((p, i) => i === 0 || Number(p.month.slice(5)) % 3 === 0 || i === projection.length - 1) : projection;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-ink-muted">
            <th scope="col" className="px-5 py-3 font-medium">
              Mese
            </th>
            {accounts.map((a) => (
              <th key={a.id} scope="col" className="px-3 py-3 text-right font-medium">
                {a.name}
              </th>
            ))}
            {showTotal && (
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Totale
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.month} className="border-t border-[var(--mio-border)]">
              <th scope="row" className="px-5 py-2 text-left font-medium capitalize">
                {monthLabel(p.month)}
              </th>
              {accounts.map((a) => (
                <td key={a.id} className="px-3 py-2 text-right">
                  <Amount cents={p.byAccount[a.id] ?? 0} tone={(p.byAccount[a.id] ?? 0) < 0 ? "expense" : "neutral"} size="sm" />
                </td>
              ))}
              {showTotal && (
                <td className="px-5 py-2 text-right">
                  <Amount cents={p.totalCents} tone={p.totalCents < 0 ? "expense" : "neutral"} size="sm" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
