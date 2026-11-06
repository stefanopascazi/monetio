"use client";

import { useState } from "react";
import { AmountInput, Button, TextField } from "@monetio/ui";
import { markEntryPaid } from "@/app/actions/rules";
import { FormMessage } from "@/components/common/FormMessage";
import { FeeInput } from "@/components/payments/FeeInput";
import { useFormAction } from "@/hooks/useFormAction";
import { FEE_SOURCE_LABEL, feeSource } from "@/lib/domain/fees";
import type { DueView } from "./DueList";

/** Inline confirmation of a deadline with the actual amount, date and (bonifico/CBill/transfer) fee. */
export function PayEntryForm({ entry, today, onClose }: { entry: DueView; today: string; onClose: () => void }) {
  const [amount, setAmount] = useState<number | null>(Math.abs(entry.amountCents));
  const [fee, setFee] = useState<number | null>(entry.feeCents || null);
  const { state, pending, onSubmit, error } = useFormAction(markEntryPaid.bind(null, entry.key), onClose);
  // Only rule occurrences carry a fee (contributions are computed transfers).
  const source = entry.canConfirm ? feeSource(entry.kind, entry.paymentMethod) : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className="mx-4 mb-4 grid grid-cols-1 gap-3 rounded-[22px] bg-surface-raised p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <FormMessage state={state} />
      <input type="hidden" name="amountCents" value={amount ?? ""} />
      <AmountInput label="Importo effettivo" kind={entry.amountCents >= 0 ? "income" : "expense"} valueCents={amount} onValueChange={setAmount} error={error("amountCents")} />
      <TextField name="bookedOn" type="date" label="Pagato il" defaultValue={today} error={error("bookedOn")} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" loading={pending} disabled={!amount}>
          Registra
        </Button>
      </div>
      {source && (
        <div className="sm:col-span-3">
          <FeeInput valueCents={fee} onValueChange={setFee} hint={`${FEE_SOURCE_LABEL[source]}: le spese diventano un movimento separato`} error={error("feeCents")} />
        </div>
      )}
    </form>
  );
}
