import { Amount, Card } from "@monetio/ui";
import type { MerchantTotal } from "@/lib/data/statistics";

/** Who received the most money in the period. */
export function TopMerchantsList({ merchants }: { merchants: MerchantTotal[] }) {
  return (
    <Card title="Dove vanno i soldi" subtitle="Le voci di spesa più alte del periodo, al netto dei rimborsi">
      {merchants.length ? (
        <ol className="flex flex-col divide-y divide-border">
          {merchants.map((m, i) => (
            <li key={m.label} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs font-semibold text-ink-muted">{i + 1}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{m.label}</span>
                  <span className="text-xs text-ink-muted">{m.count === 1 ? "1 pagamento" : `${m.count} pagamenti`}</span>
                </span>
              </span>
              <Amount cents={m.totalCents} tone="neutral" />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-muted">Nessuna spesa registrata nel periodo.</p>
      )}
    </Card>
  );
}
