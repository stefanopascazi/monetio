"use client";

import { Switch, TextField } from "@monetio/ui";
import type { AccountDefaults } from "./AccountForm";

export interface AccountBankFieldsProps {
  defaults: Pick<AccountDefaults, "ibanMasked" | "bic" | "cardLast4">;
  removeIban: boolean;
  onRemoveIbanChange: (remove: boolean) => void;
  error: (field: string) => string | undefined;
}

/** IBAN, BIC and card digits: used by imports to recognise giroconti between household accounts. */
export function AccountBankFields({ defaults, removeIban, onRemoveIbanChange, error }: AccountBankFieldsProps) {
  const saved = defaults.ibanMasked ?? null;
  return (
    <>
      <TextField
        name="iban"
        label="IBAN"
        optional
        autoComplete="off"
        spellCheck={false}
        disabled={removeIban}
        placeholder={saved ?? "Es. IT60 X054 2811 1010 0000 0123 456"}
        hint={saved ? `Salvato: ${saved}. Lascia vuoto per non cambiarlo.` : "Serve a riconoscere i giroconti negli estratti conto."}
        error={error("iban")}
      />
      {saved && <Switch label="Rimuovi IBAN" checked={removeIban} onCheckedChange={onRemoveIbanChange} />}
      <TextField name="bic" label="BIC/SWIFT" optional autoComplete="off" spellCheck={false} placeholder="Es. BPMOIT22" defaultValue={defaults.bic ?? ""} error={error("bic")} />
      <TextField
        name="cardLast4"
        label="Carte collegate"
        optional
        inputMode="numeric"
        autoComplete="off"
        placeholder="Es. 1234, 5678"
        hint="Ultime 4 cifre di ogni carta, separate da virgola."
        defaultValue={(defaults.cardLast4 ?? []).join(", ")}
        error={error("cardLast4")}
      />
    </>
  );
}
