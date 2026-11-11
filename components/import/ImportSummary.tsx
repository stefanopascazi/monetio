"use client";

import { Alert, Amount, Button, Card } from "@monetio/ui";
import { dateLabel } from "@/lib/domain/dates";
import type { SelectionSummary } from "./import-view";

export interface ImportSummaryProps {
  summary: SelectionSummary | null;
  openingDate: string | null;
  checking: boolean;
  error: string | null;
  importing: boolean;
  onConfirm: () => void;
}

/** What will be imported, the reasons for what is left out, and the confirm button. */
export function ImportSummary({ summary, openingDate, checking, error, importing, onConfirm }: ImportSummaryProps) {
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!summary) return <Card title="Riepilogo" subtitle={checking ? "Controllo dei movimenti già presenti…" : "Nessun movimento valido nel file."} />;
  const { count, totalCents, from, to, duplicates, possible, beforeOpening } = summary;
  return (
    <Card title="Riepilogo" tone="mint">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">Da importare</dt>
            <dd className="text-lg font-semibold">{count} movimenti</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Totale</dt>
            <dd>
              <Amount cents={totalCents} size="lg" showSign />
            </dd>
          </div>
          {from && to && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Periodo</dt>
              <dd>{from === to ? dateLabel(from) : `dal ${dateLabel(from)} al ${dateLabel(to)}`}</dd>
            </div>
          )}
        </dl>
        {duplicates > 0 && <p className="text-sm text-ink-muted">{duplicates} movimenti sono già presenti e non verranno importati di nuovo.</p>}
        {beforeOpening > 0 && openingDate && (
          <Alert tone="info">
            {beforeOpening} movimenti fino al {dateLabel(openingDate)} sono esclusi: sono già compresi nel saldo iniziale del conto.
          </Alert>
        )}
        {possible > 0 && (
          <Alert tone="warning">
            {possible} movimenti somigliano a movimenti già registrati (stesso importo, data vicina). Restano esclusi finché non li selezioni.
          </Alert>
        )}
        <Button block loading={importing} disabled={count === 0 || checking} onClick={onConfirm}>
          {count === 1 ? "Importa 1 movimento" : `Importa ${count} movimenti`}
        </Button>
      </div>
    </Card>
  );
}
