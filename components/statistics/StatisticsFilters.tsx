"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl, Select } from "@monetio/ui";
import { withQuery } from "@/lib/data/params";
import { type Period, PERIODS } from "./params";

export interface StatisticsFiltersProps {
  accounts: { id: string; name: string }[];
  accountId: string | null;
  period: Period;
}

const ALL = "";

/** Account and period of the statistics, kept in the URL so the page can be shared and reloaded. */
export function StatisticsFilters({ accounts, accountId, period }: StatisticsFiltersProps) {
  const router = useRouter();
  const go = (conto: string | null, mesi: Period) => router.push(withQuery("/analisi/statistiche", { conto, mesi: mesi === "6" ? undefined : mesi }), { scroll: false });
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Select
        label="Conto"
        className="min-w-56"
        value={accountId ?? ALL}
        onChange={(e) => go(e.target.value || null, period)}
        options={[{ value: ALL, label: "Tutti i conti" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
      />
      <SegmentedControl<Period> aria-label="Periodo" size="sm" value={period} onChange={(v) => go(accountId, v)} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
    </div>
  );
}
