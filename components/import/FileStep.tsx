"use client";

import { useId } from "react";
import { Button, Card, Field, Select, type SelectOption } from "@monetio/ui";
import { FileSpreadsheet, RotateCcw } from "lucide-react";

export interface FileStepProps {
  accounts: SelectOption[];
  accountId: string;
  onAccountChange: (id: string) => void;
  fileName: string | null;
  bank: string | null;
  reading: boolean;
  onFile: (file: File) => void;
  onReset: () => void;
}

/** Target account and statement file. */
export function FileStep({ accounts, accountId, onAccountChange, fileName, bank, reading, onFile, onReset }: FileStepProps) {
  const inputId = useId();
  return (
    <Card title="File e conto" subtitle="Estratto conto CSV o XLSX, fino a 3 MB.">
      <div className="flex flex-col gap-4">
        <Select label="Conto di destinazione" options={accounts} value={accountId} onChange={(e) => onAccountChange(e.target.value)} />
        {fileName ? (
          <div className="flex items-center justify-between gap-3 rounded-[16px] bg-surface-raised p-3">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="truncate font-semibold">{fileName}</span>
              {bank && <span className="shrink-0 text-ink-muted">· {bank}</span>}
            </span>
            <Button variant="ghost" size="sm" iconStart={<RotateCcw />} onClick={onReset}>
              Cambia file
            </Button>
          </div>
        ) : (
          <Field label="File da importare" htmlFor={inputId} hint={reading ? "Lettura del file…" : "Revolut e Cherry Bank vengono riconosciuti da soli."}>
            <input
              id={inputId}
              type="file"
              accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={reading}
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand-ink"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </Field>
        )}
      </div>
    </Card>
  );
}
