"use client";

import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { Card, DueItem, EmptyState } from "@monetio/ui";
import { isoToDate } from "@/lib/domain/dates";
import type { RuleFrequency } from "@/lib/domain/types";
import { PayEntryForm } from "./PayEntryForm";

export interface DueView {
  key: string;
  date: string;
  description: string;
  amountCents: number;
  accountName: string;
  frequency: RuleFrequency;
  estimated: boolean;
  /** False when the paying account is not visible to the viewer. */
  payable: boolean;
}

export function DueList({ items, today, title = "Da pagare", subtitle }: { items: DueView[]; today: string; title?: string; subtitle?: string }) {
  const [paying, setPaying] = useState<string | null>(null);
  return (
    <Card tone="coral" title={title} subtitle={subtitle} padding="none">
      {!items.length ? (
        <EmptyState icon={<CalendarCheck />} title="Tutto in regola" description="Nessuna scadenza nei prossimi 31 giorni." />
      ) : (
        items.map((e) => (
          <div key={e.key}>
            <DueItem
              title={e.estimated ? `${e.description} (stima)` : e.description}
              dueDate={isoToDate(e.date)}
              amountCents={Math.abs(e.amountCents)}
              kind={e.amountCents >= 0 ? "income" : "expense"}
              frequency={e.frequency}
              account={e.accountName}
              today={isoToDate(today)}
              onMarkPaid={e.payable && paying !== e.key ? () => setPaying(e.key) : undefined}
            />
            {paying === e.key && <PayEntryForm entry={e} today={today} onClose={() => setPaying(null)} />}
          </div>
        ))
      )}
    </Card>
  );
}
