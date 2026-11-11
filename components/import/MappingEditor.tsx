"use client";

import { Card, SegmentedControl, Select, Switch } from "@monetio/ui";
import type { ColumnMapping, Grid } from "@/lib/import/types";
import { columnOptions, headerRowOptions } from "./import-view";

export interface MappingEditorProps {
  grid: Grid;
  mapping: ColumnMapping;
  bank: string | null;
  onChange: (mapping: ColumnMapping) => void;
}

const NONE = "";

/** Column choices; folded when a bank preset already filled them. */
export function MappingEditor({ grid, mapping, bank, onChange }: MappingEditorProps) {
  const columns = columnOptions(grid, mapping.headerRow);
  const set = (patch: Partial<ColumnMapping>) => onChange({ ...mapping, ...patch });
  const num = (v: string) => Number(v);
  const amount = mapping.amount;

  return (
    <Card
      title="Colonne"
      subtitle={bank ? `Formato ${bank} riconosciuto: controlla solo se qualcosa non torna.` : "Indica dove si trovano data, descrizione e importo."}
      collapsible
      defaultOpen={!bank}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select className="sm:col-span-2" label="Riga delle intestazioni" options={headerRowOptions(grid)} value={String(mapping.headerRow)} onChange={(e) => set({ headerRow: num(e.target.value) })} />
        <Select label="Data" options={columns} value={String(mapping.date)} onChange={(e) => set({ date: num(e.target.value) })} />
        <Select
          label="Formato della data"
          options={[
            { value: "dmy", label: "Giorno/mese/anno" },
            { value: "mdy", label: "Mese/giorno/anno" },
          ]}
          value={mapping.dateOrder ?? "dmy"}
          onChange={(e) => set({ dateOrder: e.target.value as "dmy" | "mdy" })}
        />
        <Select label="Descrizione" options={columns} value={String(mapping.description)} onChange={(e) => set({ description: num(e.target.value) })} />
        <Select
          label="Categoria"
          optional
          options={[{ value: NONE, label: "Nessuna" }, ...columns]}
          value={mapping.category != null ? String(mapping.category) : NONE}
          onChange={(e) => set({ category: e.target.value === NONE ? undefined : num(e.target.value) })}
        />
        <SegmentedControl
          className="sm:col-span-2"
          aria-label="Come è indicato l'importo"
          block
          options={[
            { value: "signed", label: "Importo con segno" },
            { value: "split", label: "Entrate e uscite separate" },
          ]}
          value={amount.mode}
          onChange={(mode) =>
            set({ amount: mode === "signed" ? { mode, column: amount.mode === "split" ? amount.outflow : amount.column } : { mode, inflow: amount.mode === "signed" ? amount.column : 0, outflow: amount.mode === "signed" ? amount.column : 0 } })
          }
        />
        {amount.mode === "signed" ? (
          <>
            <Select label="Importo" options={columns} value={String(amount.column)} onChange={(e) => set({ amount: { ...amount, column: num(e.target.value) } })} />
            <Switch
              label="Inverti il segno"
              description="Per gli estratti carta che mostrano le spese in positivo."
              checked={!!amount.invert}
              onCheckedChange={(invert) => set({ amount: { ...amount, invert } })}
            />
          </>
        ) : (
          <>
            <Select label="Entrate" options={columns} value={String(amount.inflow)} onChange={(e) => set({ amount: { ...amount, inflow: num(e.target.value) } })} />
            <Select label="Uscite" options={columns} value={String(amount.outflow)} onChange={(e) => set({ amount: { ...amount, outflow: num(e.target.value) } })} />
          </>
        )}
      </div>
    </Card>
  );
}
